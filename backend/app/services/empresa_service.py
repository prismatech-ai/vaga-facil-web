"""
Serviço para gerenciar fluxo de empresa e matching

Implementa matching em duas etapas conforme fluxo:
1º Match (BD CC): Prioriza candidatos com CERTIFICAÇÕES (mais confiável)
2º Match (BD CA): Usa AUTOAVALIAÇÃO como fallback (menos confiável)
"""
from sqlalchemy.orm import Session
from sqlalchemy import and_, or_
from app.models import Job, VagaCandidato, Candidate, AutoavaliacaoCompetencia, CandidatoTeste, VagaRequisito
from app.models.candidato_teste import StatusKanbanCandidato
from app.models.competencia import MapaCompetencias, CertificacaoCompetencia
import hashlib
from typing import List, Dict, Optional, Tuple
from datetime import datetime


# Constantes para cálculo de score de matching
PESO_CERTIFICACAO = 3  # Certificação vale 3x mais que autoavaliação
PESO_AUTOAVALIACAO = 1
BONUS_TESTES_COMPLETOS = 10  # Bonus por ter testes realizados


class EmpresaService:
    """Serviço para lógica de empresa e matching"""
    
    @staticmethod
    def obter_candidatos_para_vaga_v2(db: Session, vaga_id: int) -> Tuple[List[dict], int]:
        """
        Retorna candidatos que combinam com a vaga usando MATCHING PRIORITIZADO:
        
        1º MATCH (BD CC): Candidatos com CERTIFICAÇÕES nas competências requeridas
        2º MATCH (BD CA): Candidatos apenas com AUTOAVALIAÇÃO
        
        Candidatos certificados aparecem primeiro e têm score maior.
        Retorna dados anônimos.
        
        Returns:
            Tupla (lista_candidatos_anonimos, quantidade_excluida_por_filtros)
        """
        vaga = db.query(Job).filter(Job.id == vaga_id).first()
        if not vaga:
            raise ValueError("Vaga não encontrada")
        
        # Buscar requisitos da vaga
        requisitos = db.query(VagaRequisito).filter(VagaRequisito.vaga_id == vaga_id).all()
        requisitos_map = {req.competencia_id: req for req in requisitos}
        competencias_requeridas = [req.competencia_id for req in requisitos if req.competencia_id]
        
        # Buscar candidatos que têm a área de atuação da vaga
        candidatos_area = db.query(Candidate).filter(
            Candidate.area_atuacao == vaga.area_atuacao,
            Candidate.onboarding_completo == True
        ).all()
        
        if not candidatos_area:
            return [], 0
        
        candidate_ids = [c.id for c in candidatos_area]
        
        # ====== CARREGAR DADOS DE MATCHING ======
        
        # 1. Carregar MapaCompetencias (contém certificação + autoavaliação unificados)
        mapa_competencias = db.query(MapaCompetencias).filter(
            MapaCompetencias.candidate_id.in_(candidate_ids)
        ).all()
        
        # Organizar mapa por (candidate_id, competencia_nome)
        mapa_por_candidato = {}
        for mapa in mapa_competencias:
            if mapa.candidate_id not in mapa_por_candidato:
                mapa_por_candidato[mapa.candidate_id] = {}
            mapa_por_candidato[mapa.candidate_id][mapa.competencia_nome.lower()] = {
                'certificado': mapa.nivel_certificado,
                'autoavaliacao': mapa.nivel_autoavaliacao,
                'confiabilidade': mapa.confiabilidade,
                'competencia_id': mapa.competencia_id
            }
        
        # 2. Carregar AutoavaliacaoCompetencia (fallback)
        autoavaliacoes = db.query(AutoavaliacaoCompetencia).filter(
            AutoavaliacaoCompetencia.candidate_id.in_(candidate_ids)
        ).all()
        
        autoavaliacao_map = {}
        for auto in autoavaliacoes:
            key = (auto.candidate_id, auto.competencia_id)
            autoavaliacao_map[key] = int(auto.nivel_declarado)
        
        # 3. Carregar testes completos
        testes_completos = db.query(CandidatoTeste).filter(
            CandidatoTeste.candidate_id.in_(candidate_ids),
            CandidatoTeste.status == "concluido"
        ).all()
        
        testes_map = {}
        for teste in testes_completos:
            testes_map[teste.candidate_id] = testes_map.get(teste.candidate_id, 0) + 1
        
        # 4. Carregar VagaCandidatos existentes
        vaga_candidatos_existentes = db.query(VagaCandidato).filter(
            VagaCandidato.vaga_id == vaga_id
        ).all()
        vaga_candidato_map = {vc.candidate_id: vc for vc in vaga_candidatos_existentes}
        
        # ====== PROCESSAR MATCHING ======
        
        candidatos_certificados = []  # 1º Match - BD CC
        candidatos_autoavaliados = []  # 2º Match - BD CA
        candidatos_excluidos = 0
        novos_vaga_candidatos = []
        
        for candidato in candidatos_area:
            # Calcular score de matching
            score_certificacao = 0
            score_autoavaliacao = 0
            competencias_atendidas_cert = 0
            competencias_atendidas_auto = 0
            competencias_faltando = []
            atende_minimo = True
            
            mapa_candidato = mapa_por_candidato.get(candidato.id, {})
            
            for requisito in requisitos:
                nivel_requerido = int(requisito.nivel_minimo) if requisito.nivel_minimo else 0
                competencia_nome = requisito.competencia.nome.lower() if requisito.competencia else ""
                
                # Tentar obter nível do mapa (certificação prioritária)
                dados_mapa = mapa_candidato.get(competencia_nome, {})
                nivel_certificado = dados_mapa.get('certificado')
                nivel_auto = dados_mapa.get('autoavaliacao')
                
                # Fallback para autoavaliação direta se não no mapa
                if nivel_auto is None and requisito.competencia_id:
                    nivel_auto = autoavaliacao_map.get((candidato.id, requisito.competencia_id))
                
                # Lógica de matching prioritizado
                if nivel_certificado is not None:
                    # 1º MATCH: Candidato tem CERTIFICAÇÃO
                    if nivel_certificado >= nivel_requerido:
                        score_certificacao += nivel_certificado * PESO_CERTIFICACAO
                        competencias_atendidas_cert += 1
                    else:
                        # Não atende requisito mínimo
                        atende_minimo = False
                        competencias_faltando.append({
                            'competencia': competencia_nome,
                            'requerido': nivel_requerido,
                            'candidato_cert': nivel_certificado
                        })
                        
                elif nivel_auto is not None:
                    # 2º MATCH: Candidato tem apenas AUTOAVALIAÇÃO
                    if nivel_auto >= nivel_requerido:
                        score_autoavaliacao += nivel_auto * PESO_AUTOAVALIACAO
                        competencias_atendidas_auto += 1
                    else:
                        # Não atende requisito mínimo
                        atende_minimo = False
                        competencias_faltando.append({
                            'competencia': competencia_nome,
                            'requerido': nivel_requerido,
                            'candidato_auto': nivel_auto
                        })
                else:
                    # Candidato não tem avaliação nesta competência
                    atende_minimo = False
                    competencias_faltando.append({
                        'competencia': competencia_nome,
                        'requerido': nivel_requerido,
                        'candidato': None
                    })
            
            # Verificar se atende requisitos mínimos
            if not atende_minimo:
                candidatos_excluidos += 1
                continue
            
            # Calcular score total
            score_total = score_certificacao + score_autoavaliacao
            testes_realizados = testes_map.get(candidato.id, 0)
            
            if testes_realizados > 0:
                score_total += BONUS_TESTES_COMPLETOS
            
            # Criar ou obter VagaCandidato
            vaga_candidato = vaga_candidato_map.get(candidato.id)
            
            if not vaga_candidato:
                status_kanban = StatusKanbanCandidato.TESTES_NAO_REALIZADOS
                if testes_realizados > 0:
                    status_kanban = StatusKanbanCandidato.TESTES_REALIZADOS
                
                vaga_candidato = VagaCandidato(
                    vaga_id=vaga_id,
                    candidate_id=candidato.id,
                    status_kanban=status_kanban,
                    excluido_por_filtros=False
                )
                novos_vaga_candidatos.append(vaga_candidato)
                vaga_candidato_map[candidato.id] = vaga_candidato
            
            # Determinar tipo de match
            is_certificado = competencias_atendidas_cert > 0
            
            candidato_dados = {
                'candidate_id': candidato.id,
                'vaga_candidato_id': vaga_candidato.id,
                'status_kanban': vaga_candidato.status_kanban.value,
                'testes_realizados': testes_realizados,
                'consentimento_entrevista': vaga_candidato.consentimento_entrevista,
                'score_total': score_total,
                'score_certificacao': score_certificacao,
                'score_autoavaliacao': score_autoavaliacao,
                'competencias_certificadas': competencias_atendidas_cert,
                'competencias_autoavaliadas': competencias_atendidas_auto,
                'tipo_match': '1º Match (Certificado)' if is_certificado else '2º Match (Autoavaliação)',
                'confiabilidade': 'alta' if is_certificado else 'media'
            }
            
            if is_certificado:
                candidatos_certificados.append(candidato_dados)
            else:
                candidatos_autoavaliados.append(candidato_dados)
        
        # Adicionar novos VagaCandidatos
        if novos_vaga_candidatos:
            db.add_all(novos_vaga_candidatos)
            db.commit()
        
        # Ordenar cada grupo por score (maior primeiro)
        candidatos_certificados.sort(key=lambda x: x['score_total'], reverse=True)
        candidatos_autoavaliados.sort(key=lambda x: x['score_total'], reverse=True)
        
        # RESULTADO: 1º Match (certificados) + 2º Match (autoavaliados)
        resultado_final = candidatos_certificados + candidatos_autoavaliados
        
        return resultado_final, candidatos_excluidos
    
    @staticmethod
    def obter_candidatos_para_vaga(db: Session, vaga_id: int) -> Tuple[List[dict], int]:
        """
        Retorna candidatos que combinam com a vaga (matching passivo).
        Prioriza candidatos que completaram os testes.
        Retorna dados anônimos.
        
        Returns:
            Tupla (lista_candidatos_anonimos, quantidade_excluida_por_filtros)
        """
        vaga = db.query(Job).filter(Job.id == vaga_id).first()
        if not vaga:
            raise ValueError("Vaga não encontrada")
        
        # Buscar requisitos da vaga (opcional)
        requisitos = db.query(VagaRequisito).filter(VagaRequisito.vaga_id == vaga_id).all()
        
        # Buscar candidatos que têm a área de atuação da vaga
        candidatos_area = db.query(Candidate).filter(
            Candidate.area_atuacao == vaga.area_atuacao,
            Candidate.onboarding_completo == True
        ).all()
        
        # Carregar TODAS as autoavaliações e testes de uma vez
        todas_autoavaliacao = db.query(AutoavaliacaoCompetencia).all()
        todos_testes = db.query(CandidatoTeste).filter(CandidatoTeste.status == "concluido").all()
        
        # Organizar em dicionários para acesso O(1)
        autoavaliacao_map = {}
        for auto in todas_autoavaliacao:
            key = (auto.candidate_id, auto.competencia_id)
            autoavaliacao_map[key] = int(auto.nivel_declarado)
        
        testes_completos_map = {}
        for teste in todos_testes:
            testes_completos_map[teste.candidate_id] = testes_completos_map.get(teste.candidate_id, 0) + 1
        
        # Buscar registros VagaCandidato que já existem
        vaga_candidatos_existentes = db.query(VagaCandidato).filter(
            VagaCandidato.vaga_id == vaga_id
        ).all()
        vaga_candidato_map = {
            vc.candidate_id: vc for vc in vaga_candidatos_existentes
        }
        
        candidatos_válidos = []
        candidatos_excluidos = 0
        novos_vaga_candidatos = []
        
        for candidato in candidatos_area:
            # Verificar se atende os requisitos mínimos
            atende_requisitos = True
            
            for requisito in requisitos:
                nivel_requerido = int(requisito.nivel_minimo)
                nivel_candidato = autoavaliacao_map.get((candidato.id, requisito.competencia_id), 0)
                
                if nivel_candidato < nivel_requerido:
                    atende_requisitos = False
                    break
            
            if not atende_requisitos:
                candidatos_excluidos += 1
                continue
            
            # Se passou nos filtros, criar registro de VagaCandidato se não existir
            vaga_candidato = vaga_candidato_map.get(candidato.id)
            
            if not vaga_candidato:
                # Verificar quantos testes completou
                testes_completos = testes_completos_map.get(candidato.id, 0)
                
                # Definir status inicial no kanban
                status_kanban = StatusKanbanCandidato.TESTES_NAO_REALIZADOS
                if testes_completos > 0:
                    status_kanban = StatusKanbanCandidato.TESTES_REALIZADOS
                
                vaga_candidato = VagaCandidato(
                    vaga_id=vaga_id,
                    candidate_id=candidato.id,
                    status_kanban=status_kanban,
                    excluido_por_filtros=False
                )
                novos_vaga_candidatos.append(vaga_candidato)
                vaga_candidato_map[candidato.id] = vaga_candidato
            
            testes_completos = testes_completos_map.get(candidato.id, 0)
            candidatos_válidos.append({
                'candidate_id': candidato.id,
                'vaga_candidato_id': vaga_candidato.id,
                'status_kanban': vaga_candidato.status_kanban.value,
                'testes_realizados': testes_completos,
                'consentimento_entrevista': vaga_candidato.consentimento_entrevista
            })
        
        # Adicionar todos os novos registros de uma vez
        if novos_vaga_candidatos:
            db.add_all(novos_vaga_candidatos)
            db.commit()
        
        # Ordenar: primeiro os que fizeram testes
        candidatos_válidos.sort(
            key=lambda x: (not x['testes_realizados'], x['status_kanban']),
            reverse=False
        )
        
        return candidatos_válidos, candidatos_excluidos
    
    @staticmethod
    def anonimizar_candidato(candidate_id: int) -> str:
        """Cria um ID anônimo para um candidato"""
        hash_obj = hashlib.sha256(f"candidato_{candidate_id}_{datetime.utcnow().date()}".encode())
        return hash_obj.hexdigest()[:16]
    
    @staticmethod
    def demonstrar_interesse(db: Session, vaga_id: int, candidate_id: int) -> VagaCandidato:
        """Empresa demonstra interesse em um candidato"""
        vaga_candidato = db.query(VagaCandidato).filter(
            and_(
                VagaCandidato.vaga_id == vaga_id,
                VagaCandidato.candidate_id == candidate_id
            )
        ).first()
        
        if not vaga_candidato:
            raise ValueError("Candidato não está vinculado a esta vaga")
        
        vaga_candidato.empresa_demonstrou_interesse = True
        vaga_candidato.data_interesse = datetime.utcnow()
        vaga_candidato.status_kanban = StatusKanbanCandidato.INTERESSE_EMPRESA
        db.commit()
        
        # TODO: Enviar notificação ao candidato
        return vaga_candidato
    
    @staticmethod
    def obter_dados_candidato(db: Session, vaga_id: int, candidate_id: int) -> Optional[dict]:
        """
        Retorna dados pessoais do candidato apenas se:
        1. Empresa demonstrou interesse
        2. Candidato aceitou entrevista (consentimento)
        """
        vaga_candidato = db.query(VagaCandidato).filter(
            and_(
                VagaCandidato.vaga_id == vaga_id,
                VagaCandidato.candidate_id == candidate_id
            )
        ).first()
        
        if not vaga_candidato:
            return None
        
        # REGRA CRÍTICA: Sem consentimento explícito, não retornar dados pessoais
        if not vaga_candidato.dados_pessoais_liberados or not vaga_candidato.consentimento_entrevista:
            return {
                "erro": "Dados pessoais não liberados",
                "mensagem": "Candidato ainda não consentiu em compartilhar dados"
            }
        
        candidato = db.query(Candidate).filter(Candidate.id == candidate_id).first()
        if not candidato:
            return None
        
        return {
            "id": candidato.id,
            "full_name": candidato.full_name,
            "email": candidato.user.email if candidato.user else None,
            "phone": candidato.phone,
            "cpf": candidato.cpf,  # Cuidado: informação sensível
            "location": candidato.location,
            "linkedin_url": candidato.linkedin_url,
            "portfolio_url": candidato.portfolio_url,
            "bio": candidato.bio,
            "resume_url": candidato.resume_url,  # URL do currículo em R2
            "consentimento_entrevista": True,
            "data_consentimento": vaga_candidato.data_consentimento.isoformat()
        }
    
    @staticmethod
    def obter_kanban_vaga(db: Session, vaga_id: int) -> dict:
        """
        Retorna o kanban completo de uma vaga com candidatos organizados por estado
        """
        vaga = db.query(Job).filter(Job.id == vaga_id).first()
        if not vaga:
            raise ValueError("Vaga não encontrada")
        
        # Buscar todos os candidatos vinculados à vaga
        vaga_candidatos = db.query(VagaCandidato).filter(
            VagaCandidato.vaga_id == vaga_id
        ).all()
        
        # Organizar por status
        kanban_columns = {
            StatusKanbanCandidato.AVALIACAO_COMPETENCIAS: [],
            StatusKanbanCandidato.TESTES_REALIZADOS: [],
            StatusKanbanCandidato.TESTES_NAO_REALIZADOS: [],
            StatusKanbanCandidato.INTERESSE_EMPRESA: [],
            StatusKanbanCandidato.ENTREVISTA_ACEITA: [],
            StatusKanbanCandidato.REJEITADO: []
        }
        
        candidatos_excluidos = 0
        motivos_exclusao = set()
        
        for vaga_cand in vaga_candidatos:
            if vaga_cand.excluido_por_filtros:
                candidatos_excluidos += 1
                if vaga_cand.motivo_exclusao:
                    motivos_exclusao.add(vaga_cand.motivo_exclusao)
            else:
                status = vaga_cand.status_kanban
                kanban_columns[status].append({
                    'id_anonimo': EmpresaService.anonimizar_candidato(vaga_cand.candidate_id),
                    'candidate_id': vaga_cand.candidate_id,
                    'vaga_candidato_id': vaga_cand.id,
                    'consentimento': vaga_cand.consentimento_entrevista
                })
        
        # Formatar resposta
        colunas = []
        for status, candidatos in kanban_columns.items():
            colunas.append({
                'status': status.value,
                'quantidade': len(candidatos),
                'candidatos': candidatos
            })
        
        return {
            'vaga_id': vaga_id,
            'vaga_titulo': vaga.title,
            'total_candidatos': len([v for v in vaga_candidatos if not v.excluido_por_filtros]),
            'candidatos_excluidos_por_filtros': candidatos_excluidos,
            'motivos_exclusao': list(motivos_exclusao),
            'colunas': colunas
        }
