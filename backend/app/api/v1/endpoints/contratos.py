"""
Endpoints para gestão de contratos e regras de negócio da plataforma.
"""
from datetime import datetime, timedelta
from typing import Optional, List
from fastapi import APIRouter, Depends, HTTPException, status, Request
from sqlalchemy.orm import Session
from pydantic import BaseModel
import hashlib

from app.core.database import get_db
from app.core.dependencies import get_current_user, get_current_admin
from app.models.user import User
from app.models.company import Company
from app.models.job import Job
from app.models.contrato_plataforma import (
    ContratoPlataforma, TermosConfidencialidade,
    TipoContrato, StatusContrato,
    RegrasNegocio, validar_contrato_empresa, obter_regras_negocio
)


router = APIRouter(prefix="/contratos", tags=["Contratos e Regras de Negócio"])


# ==========================================
# SCHEMAS
# ==========================================

class AceiteTermosRequest(BaseModel):
    """Request para aceite dos termos de uso"""
    aceite_termos_uso: bool
    aceite_politica_privacidade: bool
    aceite_regras_cobranca: bool
    aceite_confidencialidade: bool


class TermosConfidencialidadeRequest(BaseModel):
    """Request para aceite de termos de confidencialidade por vaga"""
    vaga_id: int
    aceite_nao_divulgar_candidatos: bool
    aceite_nao_contatar_diretamente: bool
    aceite_destruir_dados_rejeicao: bool


class ContratoResponse(BaseModel):
    """Response com dados do contrato"""
    id: int
    tipo: str
    status: str
    versao_termos: str
    data_aceite: Optional[datetime]
    data_vigencia_inicio: Optional[datetime]
    data_vigencia_fim: Optional[datetime]
    dias_para_vencer: int
    esta_vigente: bool
    aceite_termos_uso: bool
    aceite_politica_privacidade: bool
    aceite_regras_cobranca: bool
    aceite_confidencialidade: bool
    
    class Config:
        from_attributes = True


class RegrasNegocioResponse(BaseModel):
    """Response com todas as regras de negócio"""
    contrato: dict
    monetizacao: dict
    confidencialidade: dict
    fluxo_selecao: dict
    contratados: dict


class ValidacaoContratoResponse(BaseModel):
    """Response de validação de contrato"""
    valido: bool
    motivo: Optional[str] = None
    acao_necessaria: Optional[str] = None
    acao_recomendada: Optional[str] = None
    aviso: Optional[str] = None
    contrato_id: Optional[int] = None
    vigente_ate: Optional[datetime] = None


# ==========================================
# ENDPOINTS PÚBLICOS
# ==========================================

@router.get("/regras-negocio", response_model=RegrasNegocioResponse)
async def obter_regras():
    """
    Retorna todas as regras de negócio da plataforma.
    
    Público - pode ser consultado por qualquer usuário.
    """
    return obter_regras_negocio()


@router.get("/termos-uso")
async def obter_termos_uso():
    """
    Retorna o texto dos termos de uso atuais.
    """
    return {
        "versao": "1.0",
        "data_atualizacao": "2024-01-01",
        "termos": {
            "titulo": "Termos de Uso da Plataforma Vaga Fácil",
            "secoes": [
                {
                    "titulo": "1. Objeto",
                    "conteudo": "A plataforma Vaga Fácil é um serviço de intermediação de vagas de emprego que conecta empresas a candidatos qualificados através de avaliação de competências."
                },
                {
                    "titulo": "2. Taxa de Sucesso",
                    "conteudo": f"""
                    A empresa pagará uma taxa de sucesso sobre a remuneração anual do candidato contratado:
                    - Até R$ 60.000/ano: 10%
                    - R$ 60.000 a R$ 120.000/ano: 12%
                    - R$ 120.000 a R$ 240.000/ano: 15%
                    - Acima de R$ 240.000/ano: 18%
                    
                    O pagamento deve ser efetuado em até {RegrasNegocio.PRAZO_PAGAMENTO_DIAS if hasattr(RegrasNegocio, 'PRAZO_PAGAMENTO_DIAS') else 30} dias após a confirmação da contratação.
                    """
                },
                {
                    "titulo": "3. Confidencialidade",
                    "conteudo": """
                    A empresa compromete-se a:
                    - Não divulgar dados de candidatos não selecionados
                    - Não contatar candidatos fora da plataforma
                    - Destruir qualquer dado de candidatos rejeitados após o processo
                    
                    Os candidatos permanecem anônimos até que demonstrem interesse e concedam permissão para liberação de seus dados.
                    """
                },
                {
                    "titulo": "4. Garantia",
                    "conteudo": f"""
                    A plataforma oferece garantia de {RegrasNegocio.PERIODO_GARANTIA_DIAS} dias após a contratação.
                    Se o candidato não se adequar à vaga durante este período, a empresa poderá:
                    - Solicitar reembolso parcial
                    - Receber crédito para nova busca
                    """
                },
                {
                    "titulo": "5. Vigência",
                    "conteudo": f"Este contrato tem vigência de {RegrasNegocio.VIGENCIA_CONTRATO_ANOS} ano(s) a partir da data de aceite, sendo renovado automaticamente salvo manifestação em contrário com {RegrasNegocio.PRAZO_AVISO_RENOVACAO} dias de antecedência."
                }
            ]
        }
    }


# ==========================================
# ENDPOINTS DE EMPRESA
# ==========================================

@router.get("/empresa/status", response_model=ValidacaoContratoResponse)
async def verificar_status_contrato(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Verifica o status do contrato da empresa logada.
    """
    empresa = db.query(Company).filter(Company.user_id == current_user.id).first()
    if not empresa:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Empresa não encontrada"
        )
    
    return validar_contrato_empresa(empresa.id, db)


@router.get("/empresa/contrato", response_model=Optional[ContratoResponse])
async def obter_contrato_empresa(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Retorna o contrato ativo da empresa.
    """
    empresa = db.query(Company).filter(Company.user_id == current_user.id).first()
    if not empresa:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Empresa não encontrada"
        )
    
    contrato = db.query(ContratoPlataforma).filter(
        ContratoPlataforma.empresa_id == empresa.id,
        ContratoPlataforma.vaga_id.is_(None)
    ).order_by(ContratoPlataforma.created_at.desc()).first()
    
    if not contrato:
        return None
    
    return ContratoResponse(
        id=contrato.id,
        tipo=contrato.tipo.value,
        status=contrato.status.value,
        versao_termos=contrato.versao_termos,
        data_aceite=contrato.data_aceite,
        data_vigencia_inicio=contrato.data_vigencia_inicio,
        data_vigencia_fim=contrato.data_vigencia_fim,
        dias_para_vencer=contrato.dias_para_vencer,
        esta_vigente=contrato.esta_vigente,
        aceite_termos_uso=contrato.aceite_termos_uso,
        aceite_politica_privacidade=contrato.aceite_politica_privacidade,
        aceite_regras_cobranca=contrato.aceite_regras_cobranca,
        aceite_confidencialidade=contrato.aceite_confidencialidade
    )


@router.post("/empresa/aceitar-termos", response_model=ContratoResponse)
async def aceitar_termos_uso(
    request: Request,
    aceite: AceiteTermosRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Aceita os termos de uso da plataforma.
    
    Requer aceite de todos os termos:
    - Termos de uso
    - Política de privacidade
    - Regras de cobrança
    - Confidencialidade
    """
    empresa = db.query(Company).filter(Company.user_id == current_user.id).first()
    if not empresa:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Empresa não encontrada"
        )
    
    # Validar aceite de todos os termos
    if not all([
        aceite.aceite_termos_uso,
        aceite.aceite_politica_privacidade,
        aceite.aceite_regras_cobranca,
        aceite.aceite_confidencialidade
    ]):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="É necessário aceitar todos os termos para utilizar a plataforma"
        )
    
    # Verificar se já existe contrato
    contrato_existente = db.query(ContratoPlataforma).filter(
        ContratoPlataforma.empresa_id == empresa.id,
        ContratoPlataforma.vaga_id.is_(None),
        ContratoPlataforma.status == StatusContrato.ATIVO
    ).first()
    
    if contrato_existente:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Empresa já possui contrato ativo"
        )
    
    # Criar hash do documento para auditoria
    termos_hash = hashlib.sha256(
        f"{aceite.aceite_termos_uso}|{aceite.aceite_politica_privacidade}|{aceite.aceite_regras_cobranca}|{aceite.aceite_confidencialidade}|1.0|{datetime.utcnow().isoformat()}".encode()
    ).hexdigest()
    
    # Criar novo contrato
    contrato = ContratoPlataforma(
        empresa_id=empresa.id,
        tipo=TipoContrato.PADRAO,
        status=StatusContrato.ATIVO,
        versao_termos="1.0",
        data_aceite=datetime.utcnow(),
        data_vigencia_inicio=datetime.utcnow(),
        data_vigencia_fim=datetime.utcnow() + timedelta(days=365 * RegrasNegocio.VIGENCIA_CONTRATO_ANOS),
        ip_aceite=request.client.host if request.client else None,
        user_agent_aceite=request.headers.get("user-agent"),
        usuario_aceite_id=current_user.id,
        aceite_termos_uso=aceite.aceite_termos_uso,
        aceite_politica_privacidade=aceite.aceite_politica_privacidade,
        aceite_regras_cobranca=aceite.aceite_regras_cobranca,
        aceite_confidencialidade=aceite.aceite_confidencialidade,
        hash_documento=termos_hash
    )
    
    db.add(contrato)
    
    # Atualizar empresa
    empresa.contrato_ativo = True
    empresa.data_aceite_termos = datetime.utcnow()
    empresa.versao_termos_aceitos = "1.0"
    
    db.commit()
    db.refresh(contrato)
    
    return ContratoResponse(
        id=contrato.id,
        tipo=contrato.tipo.value,
        status=contrato.status.value,
        versao_termos=contrato.versao_termos,
        data_aceite=contrato.data_aceite,
        data_vigencia_inicio=contrato.data_vigencia_inicio,
        data_vigencia_fim=contrato.data_vigencia_fim,
        dias_para_vencer=contrato.dias_para_vencer,
        esta_vigente=contrato.esta_vigente,
        aceite_termos_uso=contrato.aceite_termos_uso,
        aceite_politica_privacidade=contrato.aceite_politica_privacidade,
        aceite_regras_cobranca=contrato.aceite_regras_cobranca,
        aceite_confidencialidade=contrato.aceite_confidencialidade
    )


@router.post("/empresa/renovar-contrato", response_model=ContratoResponse)
async def renovar_contrato(
    request: Request,
    aceite: AceiteTermosRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Renova o contrato da empresa.
    """
    empresa = db.query(Company).filter(Company.user_id == current_user.id).first()
    if not empresa:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Empresa não encontrada"
        )
    
    # Validar aceite de todos os termos
    if not all([
        aceite.aceite_termos_uso,
        aceite.aceite_politica_privacidade,
        aceite.aceite_regras_cobranca,
        aceite.aceite_confidencialidade
    ]):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="É necessário aceitar todos os termos para renovar o contrato"
        )
    
    # Buscar contrato atual
    contrato_atual = db.query(ContratoPlataforma).filter(
        ContratoPlataforma.empresa_id == empresa.id,
        ContratoPlataforma.vaga_id.is_(None)
    ).order_by(ContratoPlataforma.created_at.desc()).first()
    
    # Marcar contrato anterior como vencido
    if contrato_atual:
        contrato_atual.status = StatusContrato.VENCIDO
    
    # Criar hash do documento
    termos_hash = hashlib.sha256(
        f"{aceite.aceite_termos_uso}|{aceite.aceite_politica_privacidade}|{aceite.aceite_regras_cobranca}|{aceite.aceite_confidencialidade}|1.0|{datetime.utcnow().isoformat()}".encode()
    ).hexdigest()
    
    # Criar novo contrato
    novo_contrato = ContratoPlataforma(
        empresa_id=empresa.id,
        tipo=TipoContrato.PADRAO,
        status=StatusContrato.ATIVO,
        versao_termos="1.0",
        data_aceite=datetime.utcnow(),
        data_vigencia_inicio=datetime.utcnow(),
        data_vigencia_fim=datetime.utcnow() + timedelta(days=365 * RegrasNegocio.VIGENCIA_CONTRATO_ANOS),
        ip_aceite=request.client.host if request.client else None,
        user_agent_aceite=request.headers.get("user-agent"),
        usuario_aceite_id=current_user.id,
        aceite_termos_uso=aceite.aceite_termos_uso,
        aceite_politica_privacidade=aceite.aceite_politica_privacidade,
        aceite_regras_cobranca=aceite.aceite_regras_cobranca,
        aceite_confidencialidade=aceite.aceite_confidencialidade,
        hash_documento=termos_hash
    )
    
    db.add(novo_contrato)
    
    # Atualizar empresa
    empresa.contrato_ativo = True
    empresa.data_aceite_termos = datetime.utcnow()
    empresa.versao_termos_aceitos = "1.0"
    
    db.commit()
    db.refresh(novo_contrato)
    
    return ContratoResponse(
        id=novo_contrato.id,
        tipo=novo_contrato.tipo.value,
        status=novo_contrato.status.value,
        versao_termos=novo_contrato.versao_termos,
        data_aceite=novo_contrato.data_aceite,
        data_vigencia_inicio=novo_contrato.data_vigencia_inicio,
        data_vigencia_fim=novo_contrato.data_vigencia_fim,
        dias_para_vencer=novo_contrato.dias_para_vencer,
        esta_vigente=novo_contrato.esta_vigente,
        aceite_termos_uso=novo_contrato.aceite_termos_uso,
        aceite_politica_privacidade=novo_contrato.aceite_politica_privacidade,
        aceite_regras_cobranca=novo_contrato.aceite_regras_cobranca,
        aceite_confidencialidade=novo_contrato.aceite_confidencialidade
    )


# ==========================================
# TERMOS DE CONFIDENCIALIDADE POR VAGA
# ==========================================

@router.post("/vaga/aceitar-confidencialidade")
async def aceitar_confidencialidade_vaga(
    request: Request,
    dados: TermosConfidencialidadeRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Aceita os termos de confidencialidade para uma vaga específica.
    
    Necessário antes de visualizar candidatos da vaga.
    """
    empresa = db.query(Company).filter(Company.user_id == current_user.id).first()
    if not empresa:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Empresa não encontrada"
        )
    
    # Verificar se vaga pertence à empresa
    vaga = db.query(Job).filter(
        Job.id == dados.vaga_id,
        Job.company_id == empresa.id
    ).first()
    
    if not vaga:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Vaga não encontrada"
        )
    
    # Validar aceite obrigatório
    if not dados.aceite_nao_divulgar_candidatos:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="É obrigatório aceitar não divulgar dados dos candidatos"
        )
    
    # Verificar se já existe termo para esta vaga
    termo_existente = db.query(TermosConfidencialidade).filter(
        TermosConfidencialidade.empresa_id == empresa.id,
        TermosConfidencialidade.vaga_id == dados.vaga_id
    ).first()
    
    if termo_existente:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Termos de confidencialidade já foram aceitos para esta vaga"
        )
    
    # Criar termo
    termo = TermosConfidencialidade(
        empresa_id=empresa.id,
        vaga_id=dados.vaga_id,
        ip_aceite=request.client.host if request.client else None,
        usuario_aceite_id=current_user.id,
        aceite_nao_divulgar_candidatos=dados.aceite_nao_divulgar_candidatos,
        aceite_nao_contatar_diretamente=dados.aceite_nao_contatar_diretamente,
        aceite_destruir_dados_rejeicao=dados.aceite_destruir_dados_rejeicao
    )
    
    db.add(termo)
    db.commit()
    
    return {
        "success": True,
        "message": "Termos de confidencialidade aceitos com sucesso",
        "vaga_id": dados.vaga_id
    }


@router.get("/vaga/{vaga_id}/confidencialidade")
async def verificar_confidencialidade_vaga(
    vaga_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Verifica se os termos de confidencialidade foram aceitos para a vaga.
    """
    empresa = db.query(Company).filter(Company.user_id == current_user.id).first()
    if not empresa:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Empresa não encontrada"
        )
    
    termo = db.query(TermosConfidencialidade).filter(
        TermosConfidencialidade.empresa_id == empresa.id,
        TermosConfidencialidade.vaga_id == vaga_id
    ).first()
    
    if not termo:
        return {
            "aceito": False,
            "mensagem": "Termos de confidencialidade não aceitos para esta vaga"
        }
    
    return {
        "aceito": True,
        "data_aceite": termo.data_aceite,
        "aceite_nao_divulgar_candidatos": termo.aceite_nao_divulgar_candidatos,
        "aceite_nao_contatar_diretamente": termo.aceite_nao_contatar_diretamente,
        "aceite_destruir_dados_rejeicao": termo.aceite_destruir_dados_rejeicao
    }


# ==========================================
# HISTÓRICO DE CONTRATOS
# ==========================================

@router.get("/empresa/historico", response_model=List[ContratoResponse])
async def listar_historico_contratos(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Lista o histórico de contratos da empresa.
    """
    empresa = db.query(Company).filter(Company.user_id == current_user.id).first()
    if not empresa:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Empresa não encontrada"
        )
    
    contratos = db.query(ContratoPlataforma).filter(
        ContratoPlataforma.empresa_id == empresa.id,
        ContratoPlataforma.vaga_id.is_(None)
    ).order_by(ContratoPlataforma.created_at.desc()).all()
    
    return [
        ContratoResponse(
            id=c.id,
            tipo=c.tipo.value,
            status=c.status.value,
            versao_termos=c.versao_termos,
            data_aceite=c.data_aceite,
            data_vigencia_inicio=c.data_vigencia_inicio,
            data_vigencia_fim=c.data_vigencia_fim,
            dias_para_vencer=c.dias_para_vencer,
            esta_vigente=c.esta_vigente,
            aceite_termos_uso=c.aceite_termos_uso,
            aceite_politica_privacidade=c.aceite_politica_privacidade,
            aceite_regras_cobranca=c.aceite_regras_cobranca,
            aceite_confidencialidade=c.aceite_confidencialidade
        )
        for c in contratos
    ]


# ==========================================
# ADMIN - GESTÃO DE CONTRATOS
# ==========================================

@router.get("/admin/contratos-a-vencer")
async def listar_contratos_a_vencer(
    dias: int = 30,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Lista contratos que vencem nos próximos X dias.
    
    Apenas para administradores.
    """
    if current_user.role != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Acesso não autorizado"
        )
    
    data_limite = datetime.utcnow() + timedelta(days=dias)
    
    contratos = db.query(ContratoPlataforma).filter(
        ContratoPlataforma.status == StatusContrato.ATIVO,
        ContratoPlataforma.data_vigencia_fim <= data_limite
    ).all()
    
    resultado = []
    for c in contratos:
        empresa = db.query(Company).filter(Company.id == c.empresa_id).first()
        resultado.append({
            "contrato_id": c.id,
            "empresa_id": c.empresa_id,
            "empresa_nome": empresa.razao_social if empresa else "N/A",
            "data_vencimento": c.data_vigencia_fim,
            "dias_para_vencer": c.dias_para_vencer
        })
    
    return resultado


@router.post("/admin/cancelar-contrato/{contrato_id}")
async def cancelar_contrato(
    contrato_id: int,
    motivo: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Cancela um contrato (apenas administradores).
    """
    if current_user.role != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Acesso não autorizado"
        )
    
    contrato = db.query(ContratoPlataforma).filter(
        ContratoPlataforma.id == contrato_id
    ).first()
    
    if not contrato:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Contrato não encontrado"
        )
    
    contrato.status = StatusContrato.CANCELADO
    contrato.data_cancelamento = datetime.utcnow()
    contrato.motivo_cancelamento = motivo
    
    # Atualizar empresa
    empresa = db.query(Company).filter(Company.id == contrato.empresa_id).first()
    if empresa:
        empresa.contrato_ativo = False
    
    db.commit()
    
    return {
        "success": True,
        "message": "Contrato cancelado com sucesso"
    }
