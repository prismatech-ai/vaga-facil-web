"""
Serviço de Workflow/Fluxo do Pipeline
Gerencia transições de estado, regras de negócio, notificações e auditoria
"""
from sqlalchemy.orm import Session
from fastapi import HTTPException, status
from datetime import datetime, timedelta
from typing import Optional, Dict, Any, List
import logging
import json

from app.models.candidato_teste import VagaCandidato, StatusKanbanCandidato
from app.models.candidate import Candidate
from app.models.job import Job
from app.models.company import Company
from app.models.notificacao import NotificacaoEnviada, ConfigPreco, ConfigServico
from app.models.historico_estado import HistoricoEstadoPipeline, get_visibilidade_estado, candidato_visivel_para_outras_vagas
from app.services.email_service import EmailService

logger = logging.getLogger(__name__)


# Transições permitidas no pipeline
TRANSICOES_PERMITIDAS = {
    StatusKanbanCandidato.AVALIACAO_COMPETENCIAS: [
        StatusKanbanCandidato.TESTES_REALIZADOS,
        StatusKanbanCandidato.TESTES_NAO_REALIZADOS,
        StatusKanbanCandidato.REJEITADO,
    ],
    StatusKanbanCandidato.TESTES_REALIZADOS: [
        StatusKanbanCandidato.INTERESSE_EMPRESA,
        StatusKanbanCandidato.REJEITADO,
    ],
    StatusKanbanCandidato.TESTES_NAO_REALIZADOS: [
        StatusKanbanCandidato.TESTES_REALIZADOS,
        StatusKanbanCandidato.REJEITADO,
    ],
    StatusKanbanCandidato.INTERESSE_EMPRESA: [
        StatusKanbanCandidato.ENTREVISTA_ACEITA,
        StatusKanbanCandidato.REJEITADO,
    ],
    StatusKanbanCandidato.ENTREVISTA_ACEITA: [
        StatusKanbanCandidato.SELECIONADO,  # Empresa seleciona para contratação
        StatusKanbanCandidato.REJEITADO,
    ],
    StatusKanbanCandidato.SELECIONADO: [
        StatusKanbanCandidato.CONTRATADO,  # Confirma contratação
        StatusKanbanCandidato.REJEITADO,  # Candidato desiste ou empresa muda de ideia
    ],
    StatusKanbanCandidato.CONTRATADO: [
        StatusKanbanCandidato.EM_GARANTIA,
    ],
    StatusKanbanCandidato.EM_GARANTIA: [
        StatusKanbanCandidato.GARANTIA_FINALIZADA,
        StatusKanbanCandidato.REEMBOLSO_SOLICITADO,
    ],
    StatusKanbanCandidato.REEMBOLSO_SOLICITADO: [
        StatusKanbanCandidato.GARANTIA_FINALIZADA,
    ],
    StatusKanbanCandidato.REJEITADO: [],  # Estado final
    StatusKanbanCandidato.GARANTIA_FINALIZADA: [],  # Estado final
}

# Timeout em horas para cada estado
TIMEOUTS_ESTADOS = {
    StatusKanbanCandidato.INTERESSE_EMPRESA: 48,  # 48 horas para candidato responder
}

# Mapeamento de notificações por evento
NOTIFICACOES_POR_EVENTO = {
    "interesse_empresa": {
        "destinatario": "candidato",
        "tipo": "company_interest",
        "assunto": "Uma empresa quer conhecer você!",
    },
    "entrevista_aceita": {
        "destinatario": "empresa",
        "tipo": "candidate_accepted",
        "assunto": "Candidato aceitou entrevista",
    },
    "entrevista_recusada": {
        "destinatario": "empresa",
        "tipo": "candidate_declined",
        "assunto": "Candidato recusou entrevista",
    },
    "candidato_selecionado": {
        "destinatario": "candidato",
        "tipo": "selected_for_hiring",
        "assunto": "Você foi selecionado para contratação!",
    },
    "contratacao": {
        "destinatario": "candidato",
        "tipo": "hired_confirmation",
        "assunto": "Parabéns! Você foi contratado!",
    },
    "pagamento_pendente": {
        "destinatario": "empresa",
        "tipo": "payment_pending",
        "assunto": "Pagamento pendente - Contratação confirmada",
    },
    "pagamento_confirmado": {
        "destinatario": "empresa",
        "tipo": "payment_confirmed",
        "assunto": "Pagamento confirmado",
    },
    "garantia_iniciada": {
        "destinatario": "empresa",
        "tipo": "warranty_started",
        "assunto": "Período de garantia iniciado",
    },
    "garantia_finalizada": {
        "destinatario": "empresa",
        "tipo": "warranty_ended",
        "assunto": "Período de garantia finalizado",
    },
    "garantia_finalizada_candidato": {
        "destinatario": "candidato",
        "tipo": "warranty_ended_candidate",
        "assunto": "Seu período de garantia terminou - Deseja voltar ao mercado?",
    },
    "lembrete_resposta": {
        "destinatario": "candidato",
        "tipo": "response_reminder",
        "assunto": "Lembrete: Responda ao interesse da empresa",
    },
}


class WorkflowService:
    """Serviço para gerenciar o fluxo do pipeline"""
    
    def __init__(self, db: Session):
        self.db = db
    
    def validar_transicao(
        self,
        status_atual: StatusKanbanCandidato,
        novo_status: StatusKanbanCandidato
    ) -> bool:
        """Valida se a transição de estado é permitida"""
        transicoes = TRANSICOES_PERMITIDAS.get(status_atual, [])
        return novo_status in transicoes
    
    async def transicionar_status(
        self,
        vaga_candidato_id: int,
        novo_status: StatusKanbanCandidato,
        dados_adicionais: Optional[Dict[str, Any]] = None,
        usuario_id: Optional[int] = None,
        tipo_usuario: str = "sistema",
        motivo: Optional[str] = None,
        automatico: bool = False,
        ip_address: Optional[str] = None,
        user_agent: Optional[str] = None
    ) -> VagaCandidato:
        """
        Realiza a transição de status com validação, efeitos colaterais e auditoria
        """
        vaga_candidato = self.db.query(VagaCandidato).filter(
            VagaCandidato.id == vaga_candidato_id
        ).first()
        
        if not vaga_candidato:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Registro de candidato na vaga não encontrado"
            )
        
        status_atual = vaga_candidato.status_kanban
        
        # Validar transição
        if not self.validar_transicao(status_atual, novo_status):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Transição de {status_atual.value} para {novo_status.value} não permitida"
            )
        
        # Registrar histórico/auditoria ANTES da transição
        await self._registrar_historico(
            vaga_candidato=vaga_candidato,
            estado_anterior=status_atual.value,
            estado_novo=novo_status.value,
            usuario_id=usuario_id,
            tipo_usuario=tipo_usuario,
            motivo=motivo,
            dados_adicionais=dados_adicionais,
            automatico=automatico,
            ip_address=ip_address,
            user_agent=user_agent
        )
        
        # Aplicar efeitos colaterais baseados no novo status
        await self._aplicar_efeitos_transicao(vaga_candidato, novo_status, dados_adicionais)
        
        # Atualizar visibilidade baseada no estado
        vaga_candidato.visivel_outras_vagas = candidato_visivel_para_outras_vagas(novo_status.value)
        
        # Atualizar status
        vaga_candidato.status_kanban = novo_status
        vaga_candidato.updated_at = datetime.now()
        
        self.db.commit()
        self.db.refresh(vaga_candidato)
        
        logger.info(f"Transição de estado: {status_atual.value} -> {novo_status.value} para vaga_candidato_id={vaga_candidato_id}")
        
        return vaga_candidato
    
    async def _registrar_historico(
        self,
        vaga_candidato: VagaCandidato,
        estado_anterior: Optional[str],
        estado_novo: str,
        usuario_id: Optional[int] = None,
        tipo_usuario: str = "sistema",
        motivo: Optional[str] = None,
        dados_adicionais: Optional[Dict[str, Any]] = None,
        automatico: bool = False,
        ip_address: Optional[str] = None,
        user_agent: Optional[str] = None
    ):
        """Registra a mudança de estado no histórico de auditoria"""
        historico = HistoricoEstadoPipeline(
            vaga_candidato_id=vaga_candidato.id,
            estado_anterior=estado_anterior,
            estado_novo=estado_novo,
            usuario_id=usuario_id,
            tipo_usuario=tipo_usuario,
            motivo=motivo,
            dados_adicionais=json.dumps(dados_adicionais) if dados_adicionais else None,
            automatico=automatico,
            ip_address=ip_address,
            user_agent=user_agent
        )
        self.db.add(historico)
        logger.debug(f"Histórico registrado: {estado_anterior} -> {estado_novo}")
    
    async def _aplicar_efeitos_transicao(
        self,
        vaga_candidato: VagaCandidato,
        novo_status: StatusKanbanCandidato,
        dados: Optional[Dict[str, Any]] = None
    ):
        """Aplica efeitos colaterais específicos de cada transição"""
        dados = dados or {}
        
        if novo_status == StatusKanbanCandidato.INTERESSE_EMPRESA:
            vaga_candidato.empresa_demonstrou_interesse = True
            vaga_candidato.data_interesse = datetime.now()
            await self._enviar_notificacao(vaga_candidato, "interesse_empresa")
        
        elif novo_status == StatusKanbanCandidato.ENTREVISTA_ACEITA:
            vaga_candidato.consentimento_entrevista = True
            vaga_candidato.data_consentimento = datetime.now()
            vaga_candidato.dados_pessoais_liberados = True
            if dados.get("data_entrevista"):
                vaga_candidato.data_entrevista = dados["data_entrevista"]
                vaga_candidato.entrevista_agendada = True
            # Registrar match e notificar cliente
            await self.registrar_match(vaga_candidato)
            await self._enviar_notificacao(vaga_candidato, "entrevista_aceita")
        
        elif novo_status == StatusKanbanCandidato.SELECIONADO:
            # Empresa selecionou candidato para contratação
            vaga_candidato.data_selecao = datetime.now()
            vaga_candidato.visivel_outras_vagas = False  # Reservado para esta vaga
            if dados.get("notas_selecao"):
                vaga_candidato.notas_selecao = dados["notas_selecao"]
            await self._enviar_notificacao(vaga_candidato, "candidato_selecionado")
        
        elif novo_status == StatusKanbanCandidato.REJEITADO:
            if dados.get("motivo"):
                vaga_candidato.motivo_exclusao = dados["motivo"]
            
            # REGRA DE CONFIDENCIALIDADE: Revogar acesso aos dados pessoais
            # Candidatos rejeitados devem permanecer anônimos para a empresa
            vaga_candidato.dados_pessoais_liberados = False
            vaga_candidato.consentimento_entrevista = False
            vaga_candidato.visivel_outras_vagas = True  # Volta a estar disponível para outras vagas
            
            # Registrar data da rejeição para auditoria
            vaga_candidato.data_resultado = datetime.now()
        
        elif novo_status == StatusKanbanCandidato.CONTRATADO:
            vaga_candidato.foi_contratado = True
            vaga_candidato.data_resultado = datetime.now()
            vaga_candidato.pagamento_pendente = True
            
            # Calcular valor da taxa
            valor_taxa = await self._calcular_taxa(vaga_candidato)
            vaga_candidato.valor_taxa = valor_taxa
            
            await self._enviar_notificacao(vaga_candidato, "contratacao")
            await self._enviar_notificacao(vaga_candidato, "pagamento_pendente")
            
            # Desativar perfil do candidato
            await self._desativar_candidato(vaga_candidato.candidate_id)
        
        elif novo_status == StatusKanbanCandidato.EM_GARANTIA:
            vaga_candidato.garantia_iniciada = True
            vaga_candidato.data_inicio_garantia = datetime.now()
            vaga_candidato.data_fim_garantia = datetime.now() + timedelta(days=90)
            vaga_candidato.garantia_ativa = True
            if dados.get("data_inicio_trabalho"):
                vaga_candidato.data_inicio_trabalho = dados["data_inicio_trabalho"]
            await self._enviar_notificacao(vaga_candidato, "garantia_iniciada")
        
        elif novo_status == StatusKanbanCandidato.GARANTIA_FINALIZADA:
            vaga_candidato.garantia_ativa = False
            # Notificar empresa que garantia terminou
            await self._enviar_notificacao(vaga_candidato, "garantia_finalizada")
            # Notificar candidato perguntando se quer voltar ao mercado
            await self._enviar_notificacao(vaga_candidato, "garantia_finalizada_candidato")
            # Marcar candidato como elegível para decidir se quer voltar
            await self._marcar_candidato_pode_reativar(vaga_candidato.candidate_id)
        
        elif novo_status == StatusKanbanCandidato.REEMBOLSO_SOLICITADO:
            vaga_candidato.reembolso_solicitado = True
            vaga_candidato.data_solicitacao_reembolso = datetime.now()
            if dados.get("motivo_reembolso"):
                vaga_candidato.motivo_reembolso = dados["motivo_reembolso"]
            if dados.get("data_desligamento"):
                vaga_candidato.data_desligamento = dados["data_desligamento"]
            if dados.get("tipo_desligamento"):
                vaga_candidato.tipo_desligamento = dados["tipo_desligamento"]
            
            # Calcular valor do reembolso proporcional
            valor_reembolso = await self._calcular_reembolso(vaga_candidato)
            vaga_candidato.valor_reembolso = valor_reembolso
    
    async def _calcular_taxa(self, vaga_candidato: VagaCandidato) -> float:
        """Calcula a taxa de sucesso baseada no nível do candidato"""
        candidato = self.db.query(Candidate).filter(
            Candidate.id == vaga_candidato.candidate_id
        ).first()
        
        nivel = candidato.nivel_certificado if candidato else "pleno"
        
        config = self.db.query(ConfigPreco).filter(
            ConfigPreco.nivel == nivel.lower(),
            ConfigPreco.ativo == True
        ).first()
        
        if config:
            return config.valor_padrao
        
        # Valores padrão se não encontrar configuração
        valores_padrao = {
            "junior": 2500.0,
            "pleno": 4500.0,
            "senior": 7500.0,
        }
        return valores_padrao.get(nivel.lower(), 4500.0)
    
    async def _calcular_reembolso(self, vaga_candidato: VagaCandidato) -> float:
        """Calcula o valor do reembolso proporcional"""
        if not vaga_candidato.valor_taxa or not vaga_candidato.data_inicio_garantia:
            return 0.0
        
        data_desligamento = vaga_candidato.data_desligamento or datetime.now()
        dias_trabalhados = (data_desligamento - vaga_candidato.data_inicio_garantia).days
        
        # Tabela de reembolso proporcional
        if dias_trabalhados <= 30:
            percentual = 1.0  # 100%
        elif dias_trabalhados <= 60:
            percentual = 0.5  # 50%
        elif dias_trabalhados <= 90:
            percentual = 0.25  # 25%
        else:
            percentual = 0.0  # Fora da garantia
        
        return vaga_candidato.valor_taxa * percentual
    
    async def _desativar_candidato(self, candidate_id: int):
        """Desativa o perfil do candidato após contratação"""
        candidato = self.db.query(Candidate).filter(
            Candidate.id == candidate_id
        ).first()
        
        if candidato:
            candidato.is_active = False
            candidato.contratado = True
            candidato.data_contratacao = datetime.now()
    
    async def _marcar_candidato_pode_reativar(self, candidate_id: int):
        """
        Marca que o candidato pode decidir se quer voltar ao mercado.
        Após a garantia, o candidato recebe uma notificação e pode escolher
        se quer voltar a aparecer em vagas ou não.
        """
        candidato = self.db.query(Candidate).filter(
            Candidate.id == candidate_id
        ).first()
        
        if candidato:
            # Candidato permanece inativo, mas pode escolher reativar
            # O perfil só será reativado se o candidato explicitamente solicitar
            candidato.garantia_finalizada = True
            candidato.data_fim_garantia = datetime.now()
            logger.info(f"Candidato {candidate_id} pode agora decidir se quer voltar ao mercado")
    
    async def _enviar_notificacao(
        self,
        vaga_candidato: VagaCandidato,
        tipo_evento: str
    ):
        """Envia notificação e registra no histórico"""
        config = NOTIFICACOES_POR_EVENTO.get(tipo_evento)
        if not config:
            logger.warning(f"Configuração de notificação não encontrada para: {tipo_evento}")
            return
        
        # Buscar dados do candidato e empresa
        candidato = self.db.query(Candidate).filter(
            Candidate.id == vaga_candidato.candidate_id
        ).first()
        
        vaga = self.db.query(Job).filter(Job.id == vaga_candidato.vaga_id).first()
        empresa = self.db.query(Company).filter(Company.id == vaga.company_id).first() if vaga else None
        
        if not candidato or not vaga or not empresa:
            logger.error(f"Dados incompletos para notificação: {tipo_evento}")
            return
        
        # Determinar destinatário
        if config["destinatario"] == "candidato":
            if candidato.user:
                destinatario_email = candidato.user.email
                destinatario_nome = candidato.full_name
            else:
                logger.error("Candidato sem usuário associado")
                return
        else:
            if empresa.user:
                destinatario_email = empresa.user.email
                destinatario_nome = empresa.nome_fantasia or empresa.razao_social
            else:
                logger.error("Empresa sem usuário associado")
                return
        
        # Enviar email
        sucesso = False
        erro = None
        
        try:
            sucesso = await self._enviar_email_notificacao(
                tipo_evento=tipo_evento,
                destinatario_email=destinatario_email,
                destinatario_nome=destinatario_nome,
                candidato=candidato,
                empresa=empresa,
                vaga=vaga,
                vaga_candidato=vaga_candidato
            )
        except Exception as e:
            logger.error(f"Erro ao enviar notificação: {e}")
            erro = str(e)
        
        # Registrar no histórico
        notificacao = NotificacaoEnviada(
            vaga_candidato_id=vaga_candidato.id,
            tipo_notificacao=config["tipo"],
            canal="email",
            destinatario=destinatario_email,
            assunto=config["assunto"],
            enviado_com_sucesso=sucesso,
            erro_envio=erro
        )
        self.db.add(notificacao)
        
        # Atualizar timestamp da última notificação
        vaga_candidato.ultima_notificacao_enviada = datetime.now()
    
    async def _enviar_email_notificacao(
        self,
        tipo_evento: str,
        destinatario_email: str,
        destinatario_nome: str,
        candidato: Candidate,
        empresa: Company,
        vaga: Job,
        vaga_candidato: VagaCandidato
    ) -> bool:
        """Envia o email de notificação apropriado"""
        
        if tipo_evento == "interesse_empresa":
            return EmailService.enviar_convite_entrevista(
                candidato_email=destinatario_email,
                candidato_nome=destinatario_nome,
                empresa_nome=empresa.nome_fantasia or empresa.razao_social,
                vaga_titulo=vaga.title,
                link_resposta=f"{self._get_frontend_url()}/interview-acceptance/{vaga_candidato.id}"
            )
        
        elif tipo_evento == "entrevista_aceita":
            return EmailService.enviar_resposta_candidato(
                empresa_email=destinatario_email,
                empresa_nome=destinatario_nome,
                candidato_nome=candidato.full_name,
                vaga_titulo=vaga.title,
                aceito=True,
                email_candidato=candidato.user.email if candidato.user else None,
                telefone_candidato=candidato.phone
            )
        
        elif tipo_evento == "contratacao":
            return self._enviar_email_contratacao(
                destinatario_email=destinatario_email,
                candidato_nome=candidato.full_name,
                empresa_nome=empresa.nome_fantasia or empresa.razao_social,
                vaga_titulo=vaga.title
            )
        
        elif tipo_evento == "pagamento_pendente":
            return self._enviar_email_pagamento_pendente(
                destinatario_email=destinatario_email,
                empresa_nome=empresa.nome_fantasia or empresa.razao_social,
                candidato_nome=candidato.full_name,
                vaga_titulo=vaga.title,
                valor_taxa=vaga_candidato.valor_taxa
            )
        
        # Para outros tipos, logar e retornar False
        logger.info(f"Tipo de notificação não implementado: {tipo_evento}")
        return True  # Retorna True para não marcar como erro
    
    def _get_frontend_url(self) -> str:
        """Retorna a URL do frontend"""
        import os
        return os.getenv("FRONTEND_URL", "https://vagafacil.org")
    
    def _enviar_email_contratacao(
        self,
        destinatario_email: str,
        candidato_nome: str,
        empresa_nome: str,
        vaga_titulo: str
    ) -> bool:
        """Envia email de confirmação de contratação"""
        html = f"""
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <h2 style="color: #16a34a;">🎉 Parabéns! Você foi contratado!</h2>
            
            <p>Olá <strong>{candidato_nome}</strong>,</p>
            
            <p>Temos uma ótima notícia! A empresa <strong>{empresa_nome}</strong> confirmou sua contratação para a vaga de <strong>{vaga_titulo}</strong>.</p>
            
            <p>A empresa entrará em contato com você em breve para os próximos passos.</p>
            
            <p>Desejamos muito sucesso nessa nova jornada!</p>
            
            <hr style="margin: 30px 0; border: none; border-top: 1px solid #ddd;">
            
            <p style="color: #999; font-size: 12px;">
                VagaFácil - Plataforma de Recrutamento
            </p>
        </div>
        """
        
        email_params = EmailService._build_email_params(
            to=destinatario_email,
            subject=f"🎉 Parabéns! Você foi contratado - {vaga_titulo}",
            html=html,
            tags=[{"name": "type", "value": "hired_confirmation"}]
        )
        
        return EmailService._send_with_retry(email_params)
    
    def _enviar_email_pagamento_pendente(
        self,
        destinatario_email: str,
        empresa_nome: str,
        candidato_nome: str,
        vaga_titulo: str,
        valor_taxa: float
    ) -> bool:
        """Envia email de pagamento pendente para empresa"""
        html = f"""
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <h2 style="color: #333;">📋 Pagamento Pendente - Contratação Confirmada</h2>
            
            <p>Olá <strong>{empresa_nome}</strong>,</p>
            
            <p>A contratação de <strong>{candidato_nome}</strong> para a vaga de <strong>{vaga_titulo}</strong> foi confirmada com sucesso!</p>
            
            <div style="background: #f5f5f5; padding: 20px; border-radius: 8px; margin: 20px 0;">
                <h3 style="margin-top: 0;">Detalhes do Pagamento</h3>
                <p><strong>Taxa de Sucesso:</strong> R$ {valor_taxa:,.2f}</p>
                <p><strong>Formas de Pagamento:</strong> PIX, Boleto ou Cartão</p>
            </div>
            
            <p>Após a confirmação do pagamento, o período de garantia de 90 dias será iniciado.</p>
            
            <p>
                <a href="{self._get_frontend_url()}/empresa/pagamentos" style="display: inline-block; padding: 12px 24px; background-color: #16a34a; color: white; text-decoration: none; border-radius: 5px;">
                    Realizar Pagamento
                </a>
            </p>
            
            <hr style="margin: 30px 0; border: none; border-top: 1px solid #ddd;">
            
            <p style="color: #999; font-size: 12px;">
                VagaFácil - Plataforma de Recrutamento
            </p>
        </div>
        """
        
        email_params = EmailService._build_email_params(
            to=destinatario_email,
            subject=f"Pagamento Pendente - Contratação de {candidato_nome}",
            html=html,
            tags=[{"name": "type", "value": "payment_pending"}]
        )
        
        return EmailService._send_with_retry(email_params)
    
    # === Métodos de ação específicos ===
    
    async def empresa_demonstra_interesse(
        self,
        vaga_candidato_id: int,
        empresa_id: int,
        solicita_teste_soft_skills: bool = False,
        solicita_entrevista_tecnica: bool = False,
        aceita_acordo_exclusividade: bool = False
    ) -> VagaCandidato:
        """
        Empresa demonstra interesse em um candidato.
        
        Permite solicitar serviços adicionais:
        - Teste de soft skills
        - Entrevista técnica
        
        Se houver serviços solicitados, gera link de pagamento.
        """
        vaga_candidato = self._verificar_permissao_empresa(vaga_candidato_id, empresa_id)
        
        if vaga_candidato.status_kanban != StatusKanbanCandidato.TESTES_REALIZADOS:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Só é possível demonstrar interesse em candidatos com testes realizados"
            )
        
        # Salvar serviços solicitados
        vaga_candidato.solicita_teste_soft_skills = solicita_teste_soft_skills
        vaga_candidato.solicita_entrevista_tecnica = solicita_entrevista_tecnica
        
        # Calcular valor dos serviços adicionais
        valor_servicos = self._calcular_valor_servicos(
            solicita_teste_soft_skills,
            solicita_entrevista_tecnica
        )
        vaga_candidato.valor_servicos_adicionais = valor_servicos
        
        # Salvar acordo de exclusividade
        if aceita_acordo_exclusividade:
            vaga_candidato.acordo_exclusividade_aceito = True
            vaga_candidato.data_acordo_exclusividade = datetime.now()
            vaga_candidato.texto_acordo_exclusividade = self._gerar_texto_acordo_exclusividade(
                vaga_candidato
            )
        
        # Se houver serviços adicionais, gerar link de pagamento
        if valor_servicos > 0:
            link_pagamento = self._gerar_link_pagamento_servicos(
                vaga_candidato,
                valor_servicos
            )
            vaga_candidato.link_pagamento_url = link_pagamento
            vaga_candidato.link_pagamento_gerado = True
            vaga_candidato.data_envio_link_pagamento = datetime.now()
            
            # Enviar e-mail com link de pagamento
            await self._enviar_email_link_pagamento_servicos(
                vaga_candidato,
                valor_servicos,
                link_pagamento
            )
        
        self.db.commit()
        
        return await self.transicionar_status(
            vaga_candidato_id,
            StatusKanbanCandidato.INTERESSE_EMPRESA
        )
    
    def _calcular_valor_servicos(
        self,
        solicita_soft_skills: bool,
        solicita_entrevista_tecnica: bool
    ) -> float:
        """Calcula o valor total dos serviços adicionais"""
        valor_total = 0.0
        
        if solicita_soft_skills:
            config = self.db.query(ConfigServico).filter(
                ConfigServico.codigo == "SOFT_SKILLS",
                ConfigServico.ativo == True
            ).first()
            if config:
                valor_total += config.valor
            else:
                valor_total += 150.00  # Valor padrão
        
        if solicita_entrevista_tecnica:
            config = self.db.query(ConfigServico).filter(
                ConfigServico.codigo == "ENTREVISTA_TECNICA",
                ConfigServico.ativo == True
            ).first()
            if config:
                valor_total += config.valor
            else:
                valor_total += 300.00  # Valor padrão
        
        return valor_total
    
    def _gerar_texto_acordo_exclusividade(self, vaga_candidato: VagaCandidato) -> str:
        """Gera o texto do acordo de exclusividade"""
        empresa = vaga_candidato.vaga.company
        candidato = vaga_candidato.candidate
        data_atual = datetime.now().strftime("%d/%m/%Y")
        
        return f"""
ACORDO DE EXCLUSIVIDADE - VAGA FÁCIL

Data: {data_atual}

A empresa {empresa.trade_name} (CNPJ: {empresa.cnpj}) declara que:

1. Está interessada no candidato identificado pelo código #{vaga_candidato.candidate_id} 
   para a vaga #{vaga_candidato.vaga_id}.

2. Compromete-se a conduzir o processo seletivo exclusivamente através da plataforma 
   Vaga Fácil durante o período de 30 dias a partir desta data.

3. Caso a contratação seja efetuada, a empresa pagará a taxa de sucesso conforme 
   tabela vigente na plataforma.

4. Este acordo garante que o candidato não será contatado por outros meios durante 
   o período de exclusividade.

Ao aceitar este acordo, a empresa concorda com os Termos de Uso da plataforma Vaga Fácil.
"""
    
    def _gerar_link_pagamento_servicos(
        self,
        vaga_candidato: VagaCandidato,
        valor: float
    ) -> str:
        """Gera link de pagamento para serviços adicionais"""
        # Em produção, integrar com gateway de pagamento (Stripe, PagSeguro, etc.)
        frontend_url = self._get_frontend_url()
        link = f"{frontend_url}/empresa/pagamento-servicos?vaga_candidato_id={vaga_candidato.id}&valor={valor}"
        return link
    
    async def _enviar_email_link_pagamento_servicos(
        self,
        vaga_candidato: VagaCandidato,
        valor: float,
        link_pagamento: str
    ):
        """Envia e-mail para empresa com link de pagamento dos serviços"""
        empresa = vaga_candidato.vaga.company
        servicos = []
        
        if vaga_candidato.solicita_teste_soft_skills:
            servicos.append("Teste de Soft Skills (R$ 150,00)")
        if vaga_candidato.solicita_entrevista_tecnica:
            servicos.append("Entrevista Técnica (R$ 300,00)")
        
        servicos_html = "".join([f"<li>{s}</li>" for s in servicos])
        
        html = f"""
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #03565C;">📋 Serviços Adicionais Solicitados</h2>
            
            <p>Você solicitou os seguintes serviços para o candidato da vaga <strong>{vaga_candidato.vaga.title}</strong>:</p>
            
            <div style="background-color: #f5f5f5; padding: 20px; border-radius: 8px; margin: 20px 0;">
                <h3 style="margin-top: 0; color: #03565C;">Serviços Solicitados:</h3>
                <ul style="margin: 10px 0;">
                    {servicos_html}
                </ul>
                <hr style="border: none; border-top: 1px solid #ddd; margin: 15px 0;">
                <p style="font-size: 18px; font-weight: bold; margin: 0;">
                    Total: R$ {valor:.2f}
                </p>
            </div>
            
            <p>Clique no botão abaixo para realizar o pagamento:</p>
            
            <div style="text-align: center; margin: 30px 0;">
                <a href="{link_pagamento}" style="display: inline-block; padding: 15px 30px; background-color: #03565C; color: white; text-decoration: none; border-radius: 8px; font-weight: bold;">
                    Realizar Pagamento
                </a>
            </div>
            
            <p style="color: #666; font-size: 14px;">
                Após a confirmação do pagamento, os serviços serão agendados e você 
                receberá os resultados em até 5 dias úteis.
            </p>
            
            {"<div style='background-color: #e8f5e9; padding: 15px; border-radius: 8px; margin-top: 20px;'><p style='margin: 0; color: #2e7d32;'>✅ <strong>Acordo de Exclusividade aceito.</strong> O candidato está reservado para sua empresa por 30 dias.</p></div>" if vaga_candidato.acordo_exclusividade_aceito else ""}
        </div>
        """
        
        email_params = {
            "to": empresa.email,
            "subject": f"Pagamento de Serviços - Vaga {vaga_candidato.vaga.title}",
            "html": html,
            "tags": [{"name": "type", "value": "service_payment"}]
        }
        
        return EmailService._send_with_retry(email_params)
    
    async def candidato_aceita_entrevista(
        self,
        vaga_candidato_id: int,
        candidate_id: int,
        data_entrevista: Optional[datetime] = None
    ) -> VagaCandidato:
        """Candidato aceita convite de entrevista"""
        vaga_candidato = self._verificar_permissao_candidato(vaga_candidato_id, candidate_id)
        
        if vaga_candidato.status_kanban != StatusKanbanCandidato.INTERESSE_EMPRESA:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Não há interesse de empresa pendente para aceitar"
            )
        
        return await self.transicionar_status(
            vaga_candidato_id,
            StatusKanbanCandidato.ENTREVISTA_ACEITA,
            {"data_entrevista": data_entrevista}
        )
    
    async def candidato_recusa_entrevista(
        self,
        vaga_candidato_id: int,
        candidate_id: int,
        motivo: Optional[str] = None
    ) -> VagaCandidato:
        """Candidato recusa convite de entrevista"""
        vaga_candidato = self._verificar_permissao_candidato(vaga_candidato_id, candidate_id)
        
        if vaga_candidato.status_kanban != StatusKanbanCandidato.INTERESSE_EMPRESA:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Não há interesse de empresa pendente para recusar"
            )
        
        # Enviar notificação de recusa para empresa
        await self._enviar_notificacao(vaga_candidato, "entrevista_recusada")
        
        # Voltar para testes realizados (candidato permanece na pool)
        vaga_candidato.empresa_demonstrou_interesse = False
        vaga_candidato.data_interesse = None
        vaga_candidato.status_kanban = StatusKanbanCandidato.TESTES_REALIZADOS
        vaga_candidato.updated_at = datetime.now()
        
        self.db.commit()
        self.db.refresh(vaga_candidato)
        
        return vaga_candidato
    
    async def empresa_confirma_contratacao(
        self,
        vaga_candidato_id: int,
        empresa_id: int
    ) -> VagaCandidato:
        """Empresa confirma contratação do candidato"""
        vaga_candidato = self._verificar_permissao_empresa(vaga_candidato_id, empresa_id)
        
        # Aceita contratação de ENTREVISTA_ACEITA ou SELECIONADO
        if vaga_candidato.status_kanban not in [
            StatusKanbanCandidato.ENTREVISTA_ACEITA,
            StatusKanbanCandidato.SELECIONADO
        ]:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Candidato precisa ter aceito a entrevista ou estar selecionado antes da contratação"
            )
        
        return await self.transicionar_status(
            vaga_candidato_id,
            StatusKanbanCandidato.CONTRATADO
        )
    
    async def confirmar_pagamento(
        self,
        vaga_candidato_id: int,
        empresa_id: int,
        metodo_pagamento: str,
        id_transacao: str
    ) -> VagaCandidato:
        """Confirma o pagamento e inicia a garantia"""
        vaga_candidato = self._verificar_permissao_empresa(vaga_candidato_id, empresa_id)
        
        if vaga_candidato.status_kanban != StatusKanbanCandidato.CONTRATADO:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Pagamento só pode ser confirmado após contratação"
            )
        
        if not vaga_candidato.pagamento_pendente:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Não há pagamento pendente"
            )
        
        # Confirmar pagamento
        vaga_candidato.pagamento_pendente = False
        vaga_candidato.pagamento_confirmado = True
        vaga_candidato.data_pagamento = datetime.now()
        vaga_candidato.metodo_pagamento = metodo_pagamento
        vaga_candidato.id_transacao = id_transacao
        
        # Enviar notificação de pagamento confirmado
        await self._enviar_notificacao(vaga_candidato, "pagamento_confirmado")
        
        # Transicionar para garantia
        return await self.transicionar_status(
            vaga_candidato_id,
            StatusKanbanCandidato.EM_GARANTIA,
            {"data_inicio_trabalho": datetime.now()}
        )
    
    async def solicitar_reembolso(
        self,
        vaga_candidato_id: int,
        empresa_id: int,
        motivo: str,
        tipo_desligamento: str,
        data_desligamento: datetime
    ) -> VagaCandidato:
        """Empresa solicita reembolso durante período de garantia"""
        vaga_candidato = self._verificar_permissao_empresa(vaga_candidato_id, empresa_id)
        
        if vaga_candidato.status_kanban != StatusKanbanCandidato.EM_GARANTIA:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Reembolso só pode ser solicitado durante período de garantia"
            )
        
        if not vaga_candidato.garantia_ativa:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Período de garantia já expirou"
            )
        
        # Verificar se a data de desligamento está dentro da garantia
        if data_desligamento > vaga_candidato.data_fim_garantia:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Data de desligamento fora do período de garantia"
            )
        
        return await self.transicionar_status(
            vaga_candidato_id,
            StatusKanbanCandidato.REEMBOLSO_SOLICITADO,
            {
                "motivo_reembolso": motivo,
                "tipo_desligamento": tipo_desligamento,
                "data_desligamento": data_desligamento
            }
        )
    
    # === Métodos de Pré-seleção (PSE) e Match ===
    
    async def pre_selecionar_candidato(
        self,
        vaga_candidato_id: int,
        empresa_id: int,
        notas: Optional[str] = None
    ) -> VagaCandidato:
        """
        Empresa pré-seleciona um candidato (PSE).
        Primeiro passo antes de demonstrar interesse.
        """
        vaga_candidato = self._verificar_permissao_empresa(vaga_candidato_id, empresa_id)
        
        if vaga_candidato.pre_selecionado:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Candidato já foi pré-selecionado"
            )
        
        vaga_candidato.pre_selecionado = True
        vaga_candidato.data_pre_selecao = datetime.now()
        vaga_candidato.notas_pre_selecao = notas
        
        self.db.commit()
        self.db.refresh(vaga_candidato)
        
        return vaga_candidato
    
    async def consultar_interesse_candidato(
        self,
        vaga_candidato_id: int,
        empresa_id: int
    ) -> VagaCandidato:
        """
        Envia consulta ao candidato perguntando se tem interesse na vaga.
        Etapa antes de liberar identidade (LI).
        """
        vaga_candidato = self._verificar_permissao_empresa(vaga_candidato_id, empresa_id)
        
        if not vaga_candidato.pre_selecionado:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Candidato deve ser pré-selecionado antes de consultar interesse"
            )
        
        # Enviar notificação ao candidato
        await self._enviar_email_consulta_interesse(vaga_candidato)
        
        self.db.commit()
        
        return vaga_candidato
    
    async def candidato_responde_interesse(
        self,
        vaga_candidato_id: int,
        candidate_id: int,
        aceita: bool,
        motivo_rejeicao: Optional[str] = None
    ) -> VagaCandidato:
        """
        Candidato responde se tem interesse na vaga (antes de LI).
        Se aceita, avança para demonstrar interesse da empresa.
        """
        vaga_candidato = self._verificar_permissao_candidato(vaga_candidato_id, candidate_id)
        
        vaga_candidato.candidato_demonstrou_interesse = aceita
        vaga_candidato.data_interesse_candidato = datetime.now()
        
        if not aceita:
            vaga_candidato.motivo_rejeicao_candidato = motivo_rejeicao
            # Notificar empresa que candidato não tem interesse
            await self._enviar_email_candidato_sem_interesse(vaga_candidato)
        
        self.db.commit()
        self.db.refresh(vaga_candidato)
        
        return vaga_candidato
    
    def _calcular_numero_match(self, vaga_id: int) -> int:
        """Calcula o próximo número de match para a vaga"""
        ultimo_match = self.db.query(VagaCandidato).filter(
            VagaCandidato.vaga_id == vaga_id,
            VagaCandidato.numero_match.isnot(None)
        ).order_by(VagaCandidato.numero_match.desc()).first()
        
        if ultimo_match and ultimo_match.numero_match:
            return ultimo_match.numero_match + 1
        return 1
    
    async def registrar_match(
        self,
        vaga_candidato: VagaCandidato
    ):
        """Registra o match e calcula a ordem"""
        numero = self._calcular_numero_match(vaga_candidato.vaga_id)
        vaga_candidato.numero_match = numero
        vaga_candidato.data_match = datetime.now()
        
        # Enviar notificação ao cliente com número do match
        await self._enviar_notificacao_match_cliente(vaga_candidato, numero)
        
        vaga_candidato.notificacao_match_enviada = True
        vaga_candidato.data_notificacao_cliente = datetime.now()
    
    async def _enviar_notificacao_match_cliente(
        self,
        vaga_candidato: VagaCandidato,
        numero_match: int
    ):
        """Envia notificação ao cliente (empresa) sobre o match"""
        empresa = vaga_candidato.vaga.company
        vaga = vaga_candidato.vaga
        
        ordinal = self._numero_para_ordinal(numero_match)
        
        html = f"""
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #03565C;">🎯 {ordinal} Match Confirmado!</h2>
            
            <p>Parabéns! Um candidato aceitou entrevista para a vaga <strong>{vaga.title}</strong>.</p>
            
            <div style="background-color: #e8f5e9; padding: 20px; border-radius: 8px; margin: 20px 0;">
                <h3 style="margin-top: 0; color: #2e7d32;">Este é o {ordinal} match para esta vaga!</h3>
                <p style="margin: 0;">Os dados do candidato foram liberados. Acesse a plataforma para visualizar.</p>
            </div>
            
            <div style="background-color: #f5f5f5; padding: 20px; border-radius: 8px; margin: 20px 0;">
                <h4 style="margin-top: 0;">Próximos passos:</h4>
                <ol style="margin: 0; padding-left: 20px;">
                    <li>Acesse os dados completos do candidato</li>
                    <li>Entre em contato para agendar a entrevista</li>
                    <li>Após a entrevista, confirme a contratação na plataforma</li>
                </ol>
            </div>
            
            <div style="text-align: center; margin: 30px 0;">
                <a href="{self._get_frontend_url()}/empresa/candidatos/{vaga_candidato.candidate_id}" 
                   style="display: inline-block; padding: 15px 30px; background-color: #03565C; color: white; text-decoration: none; border-radius: 8px; font-weight: bold;">
                    Ver Dados do Candidato
                </a>
            </div>
        </div>
        """
        
        email_params = {
            "to": empresa.email,
            "subject": f"🎯 {ordinal} Match - {vaga.title}",
            "html": html,
            "tags": [{"name": "type", "value": "match_notification"}]
        }
        
        return EmailService._send_with_retry(email_params)
    
    def _numero_para_ordinal(self, numero: int) -> str:
        """Converte número para ordinal (1 -> 1º)"""
        return f"{numero}º"
    
    async def _enviar_email_consulta_interesse(self, vaga_candidato: VagaCandidato):
        """Envia e-mail ao candidato perguntando se tem interesse na vaga"""
        candidato = vaga_candidato.candidate
        vaga = vaga_candidato.vaga
        
        html = f"""
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #03565C;">💼 Nova Oportunidade!</h2>
            
            <p>Uma empresa está interessada em conhecer você para a vaga:</p>
            
            <div style="background-color: #f5f5f5; padding: 20px; border-radius: 8px; margin: 20px 0;">
                <h3 style="margin-top: 0; color: #03565C;">{vaga.title}</h3>
                <p>{vaga.description[:200]}...</p>
                <p><strong>Local:</strong> {vaga.city}, {vaga.state}</p>
            </div>
            
            <p>Antes de prosseguir, gostaríamos de saber: <strong>você tem interesse nesta oportunidade?</strong></p>
            
            <div style="text-align: center; margin: 30px 0;">
                <a href="{self._get_frontend_url()}/dashboard/candidato/interesse/{vaga_candidato.id}?resposta=sim" 
                   style="display: inline-block; padding: 12px 24px; background-color: #16a34a; color: white; text-decoration: none; border-radius: 8px; font-weight: bold; margin-right: 10px;">
                    ✓ Tenho Interesse
                </a>
                <a href="{self._get_frontend_url()}/dashboard/candidato/interesse/{vaga_candidato.id}?resposta=nao" 
                   style="display: inline-block; padding: 12px 24px; background-color: #dc2626; color: white; text-decoration: none; border-radius: 8px; font-weight: bold;">
                    ✗ Não Tenho Interesse
                </a>
            </div>
            
            <p style="color: #666; font-size: 14px;">
                Ao responder "Tenho Interesse", você receberá mais detalhes sobre a vaga e a empresa.
            </p>
        </div>
        """
        
        email_params = {
            "to": candidato.user.email,
            "subject": f"Nova Oportunidade: {vaga.title}",
            "html": html,
            "tags": [{"name": "type", "value": "interest_inquiry"}]
        }
        
        return EmailService._send_with_retry(email_params)
    
    async def _enviar_email_candidato_sem_interesse(self, vaga_candidato: VagaCandidato):
        """Notifica empresa que candidato não tem interesse"""
        empresa = vaga_candidato.vaga.company
        vaga = vaga_candidato.vaga
        
        html = f"""
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #03565C;">📋 Atualização de Candidato</h2>
            
            <p>O candidato pré-selecionado para a vaga <strong>{vaga.title}</strong> 
               informou que não tem interesse na oportunidade no momento.</p>
            
            <div style="background-color: #fef2f2; padding: 20px; border-radius: 8px; margin: 20px 0;">
                <p style="margin: 0; color: #dc2626;">
                    <strong>Motivo:</strong> {vaga_candidato.motivo_rejeicao_candidato or "Não informado"}
                </p>
            </div>
            
            <p>Você pode continuar explorando outros candidatos disponíveis para esta vaga.</p>
            
            <div style="text-align: center; margin: 30px 0;">
                <a href="{self._get_frontend_url()}/empresa/jobs/{vaga.id}" 
                   style="display: inline-block; padding: 12px 24px; background-color: #03565C; color: white; text-decoration: none; border-radius: 8px; font-weight: bold;">
                    Ver Outros Candidatos
                </a>
            </div>
        </div>
        """
        
        email_params = {
            "to": empresa.email,
            "subject": f"Candidato sem interesse - {vaga.title}",
            "html": html,
            "tags": [{"name": "type", "value": "candidate_not_interested"}]
        }
        
        return EmailService._send_with_retry(email_params)
    
    def _verificar_permissao_empresa(
        self,
        vaga_candidato_id: int,
        empresa_id: int
    ) -> VagaCandidato:
        """Verifica se a empresa tem permissão para acessar o registro"""
        vaga_candidato = self.db.query(VagaCandidato).join(Job).filter(
            VagaCandidato.id == vaga_candidato_id,
            Job.company_id == empresa_id
        ).first()
        
        if not vaga_candidato:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Registro não encontrado ou sem permissão"
            )
        
        return vaga_candidato
    
    def _verificar_permissao_candidato(
        self,
        vaga_candidato_id: int,
        candidate_id: int
    ) -> VagaCandidato:
        """Verifica se o candidato tem permissão para acessar o registro"""
        vaga_candidato = self.db.query(VagaCandidato).filter(
            VagaCandidato.id == vaga_candidato_id,
            VagaCandidato.candidate_id == candidate_id
        ).first()
        
        if not vaga_candidato:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Registro não encontrado ou sem permissão"
            )
        
        return vaga_candidato
    
    # === Métodos de consulta ===
    
    async def get_candidatos_aguardando_resposta(
        self,
        horas_limite: int = 48
    ) -> List[VagaCandidato]:
        """Retorna candidatos que não responderam ao interesse dentro do prazo"""
        prazo = datetime.now() - timedelta(hours=horas_limite)
        
        return self.db.query(VagaCandidato).filter(
            VagaCandidato.status_kanban == StatusKanbanCandidato.INTERESSE_EMPRESA,
            VagaCandidato.data_interesse < prazo
        ).all()
    
    async def get_garantias_expirando(
        self,
        dias_antecedencia: int = 7
    ) -> List[VagaCandidato]:
        """Retorna garantias que expiram nos próximos dias"""
        data_limite = datetime.now() + timedelta(days=dias_antecedencia)
        
        return self.db.query(VagaCandidato).filter(
            VagaCandidato.status_kanban == StatusKanbanCandidato.EM_GARANTIA,
            VagaCandidato.garantia_ativa == True,
            VagaCandidato.data_fim_garantia <= data_limite
        ).all()
    
    async def finalizar_garantias_expiradas(self):
        """Finaliza automaticamente garantias que expiraram"""
        agora = datetime.now()
        
        garantias_expiradas = self.db.query(VagaCandidato).filter(
            VagaCandidato.status_kanban == StatusKanbanCandidato.EM_GARANTIA,
            VagaCandidato.garantia_ativa == True,
            VagaCandidato.data_fim_garantia <= agora
        ).all()
        
        for vaga_candidato in garantias_expiradas:
            try:
                await self.transicionar_status(
                    vaga_candidato.id,
                    StatusKanbanCandidato.GARANTIA_FINALIZADA
                )
            except Exception as e:
                logger.error(f"Erro ao finalizar garantia {vaga_candidato.id}: {e}")
        
        return len(garantias_expiradas)
