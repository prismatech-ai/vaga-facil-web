"""
Endpoints para autoavaliação de habilidades

Escala de Proficiência (0-4):
- 0: Não exposto - Nunca trabalhou com essa competência
- 1: Básico - Conhecimento básico, executa tarefas simples com supervisão
- 2: Intermediário - Executa tarefas de forma autônoma, resolve problemas comuns
- 3: Avançado - Domínio avançado, resolve problemas complexos, pode mentorar
- 4: Especialista - Expert reconhecido, define padrões, lidera inovações
"""
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from sqlalchemy import func as sql_func
from typing import List, Optional
import json
import logging

from app.core.database import get_db
from app.core.dependencies import get_current_user, get_current_candidate, get_current_admin, get_current_company
from app.models.user import User, UserType
from app.models.candidate import Candidate
from app.models.test import Autoavaliacao
from app.models.company import Company
from app.models.job_application import JobApplication
from app.schemas.test import (
    AutoavaliacaoCreate,
    AutoavaliacaoResponse,
    AutoavaliacaoPublica,
    HabilidadeAutoavaliacao,
    EscalaProficiencia
)

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/autoavaliacao", tags=["autoavaliação"])

# Escala de proficiência padronizada
ESCALA_PROFICIENCIA = {
    0: {"nome": "Não exposto", "descricao": "Nunca trabalhou com essa competência"},
    1: {"nome": "Básico", "descricao": "Conhecimento básico, executa tarefas simples com supervisão"},
    2: {"nome": "Intermediário", "descricao": "Executa tarefas de forma autônoma, resolve problemas comuns"},
    3: {"nome": "Avançado", "descricao": "Domínio avançado, resolve problemas complexos, pode mentorar"},
    4: {"nome": "Especialista", "descricao": "Expert reconhecido, define padrões, lidera inovações"}
}


@router.get("/escala", response_model=List[EscalaProficiencia])
async def obter_escala_proficiencia():
    """
    Retorna a escala de proficiência padronizada (0-4)
    
    **Acesso**: Público
    
    Útil para exibição no frontend e referência.
    """
    return [
        EscalaProficiencia(nivel=k, nome=v["nome"], descricao=v["descricao"])
        for k, v in ESCALA_PROFICIENCIA.items()
    ]


@router.post("/salvar", response_model=AutoavaliacaoResponse)
async def salvar_autoavaliacao(
    payload: AutoavaliacaoCreate,
    candidate: Candidate = Depends(get_current_candidate),
    db: Session = Depends(get_db)
):
    """
    Salva ou atualiza a autoavaliação de habilidades do candidato
    
    **Acesso**: Apenas candidatos autenticados
    
    Exemplo:
    ```json
    {
      "respostas": [
        {"habilidade": "Python", "nivel": 3, "descricao": "Experiência em Django", "anos_experiencia": 2},
        {"habilidade": "React", "nivel": 2, "descricao": "Projetos pessoais"},
        {"habilidade": "SQL", "nivel": 3}
      ]
    }
    ```
    
    **Níveis (Escala 0-4)**:
    - 0: Não exposto - Nunca trabalhou com essa competência
    - 1: Básico - Conhecimento básico, executa tarefas simples com supervisão
    - 2: Intermediário - Executa tarefas de forma autônoma, resolve problemas comuns
    - 3: Avançado - Domínio avançado, resolve problemas complexos, pode mentorar
    - 4: Especialista - Expert reconhecido, define padrões, lidera inovações
    """
    try:
        # Validar níveis (0-4)
        for resposta in payload.respostas:
            if resposta.nivel < 0 or resposta.nivel > 4:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Nível deve estar entre 0 e 4. Recebido: {resposta.nivel}"
                )
        
        # Converter respostas para JSON
        respostas_json = [
            {
                "habilidade": r.habilidade,
                "nivel": r.nivel,
                "descricao": r.descricao,
                "anos_experiencia": r.anos_experiencia
            }
            for r in payload.respostas
        ]
        
        # Buscar se já existe autoavaliação
        autoavaliacao = db.query(Autoavaliacao).filter(
            Autoavaliacao.candidate_id == candidate.id
        ).first()
        
        if autoavaliacao:
            # Atualizar
            autoavaliacao.respostas = respostas_json
            logger.info(f"Autoavaliação atualizada para candidato {candidate.id}")
        else:
            # Criar nova
            autoavaliacao = Autoavaliacao(
                candidate_id=candidate.id,
                respostas=respostas_json
            )
            db.add(autoavaliacao)
            logger.info(f"Autoavaliação criada para candidato {candidate.id}")
        
        db.commit()
        db.refresh(autoavaliacao)
        
        # Formatar resposta
        respostas_formatadas = [
            HabilidadeAutoavaliacao(**r)
            for r in autoavaliacao.respostas
        ]
        
        return AutoavaliacaoResponse(
            id=autoavaliacao.id,
            candidate_id=autoavaliacao.candidate_id,
            respostas=respostas_formatadas,
            created_at=autoavaliacao.created_at,
            updated_at=autoavaliacao.updated_at
        )
    
    except Exception as e:
        logger.error(f"Erro ao salvar autoavaliação: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Erro ao salvar autoavaliação"
        )


@router.get("/minha", response_model=Optional[AutoavaliacaoResponse])
async def obter_minha_autoavaliacao(
    candidate: Candidate = Depends(get_current_candidate),
    db: Session = Depends(get_db)
):
    """
    Retorna a autoavaliação do candidato autenticado
    
    **Acesso**: Apenas o próprio candidato
    
    Retorna `null` se nenhuma autoavaliação foi salva
    """
    try:
        autoavaliacao = db.query(Autoavaliacao).filter(
            Autoavaliacao.candidate_id == candidate.id
        ).first()
        
        if not autoavaliacao:
            return None
        
        respostas_formatadas = [
            HabilidadeAutoavaliacao(**r)
            for r in autoavaliacao.respostas
        ]
        
        return AutoavaliacaoResponse(
            id=autoavaliacao.id,
            candidate_id=autoavaliacao.candidate_id,
            respostas=respostas_formatadas,
            created_at=autoavaliacao.created_at,
            updated_at=autoavaliacao.updated_at
        )
    
    except Exception as e:
        logger.error(f"Erro ao buscar autoavaliação: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Erro ao buscar autoavaliação"
        )


@router.get("/candidato/{candidate_id}", response_model=Optional[AutoavaliacaoPublica])
async def obter_autoavaliacao_candidato(
    candidate_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Retorna a autoavaliação de um candidato específico
    
    **Acesso**: 
    - Admin (qualquer candidato)
    - Empresa (apenas candidatos que se candidataram à suas vagas)
    - Próprio candidato
    
    **Exemplo**:
    GET /api/v1/autoavaliacao/candidato/42
    """
    try:
        # Buscar autoavaliação
        autoavaliacao = db.query(Autoavaliacao).filter(
            Autoavaliacao.candidate_id == candidate_id
        ).first()
        
        if not autoavaliacao:
            return None
        
        # Validar permissão
        if current_user.user_type == UserType.admin:
            # Admin pode ver qualquer um
            pass
        elif current_user.user_type == UserType.candidato:
            # Candidato só pode ver a si mesmo
            candidate = db.query(Candidate).filter(
                Candidate.user_id == current_user.id
            ).first()
            
            if not candidate or candidate.id != candidate_id:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="Você só pode visualizar sua própria autoavaliação"
                )
        elif current_user.user_type == UserType.empresa:
            # Empresa pode ver apenas candidatos que se candidataram a suas vagas
            company = db.query(Company).filter(
                Company.user_id == current_user.id
            ).first()
            
            if not company:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="Empresa não encontrada"
                )
            
            # Verificar se o candidato se candidatou a alguma vaga da empresa
            candidatura = db.query(JobApplication).join(
                JobApplication.job
            ).filter(
                JobApplication.candidate_id == candidate_id,
                # Aqui faz join para verificar se o job pertence à company
            ).first()
            
            if not candidatura:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="Você só pode visualizar autoavaliações de candidatos que se candidataram às suas vagas"
                )
        
        # Buscar candidato para dados pessoais
        candidate = db.query(Candidate).filter(
            Candidate.id == candidate_id
        ).first()
        
        if not candidate:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Candidato não encontrado"
            )
        
        # Formatar resposta
        respostas_formatadas = [
            HabilidadeAutoavaliacao(**r)
            for r in autoavaliacao.respostas
        ]
        
        # Mascarar CPF
        cpf_mascarado = f"{candidate.cpf[:3]}.***.{candidate.cpf[-2:]}"
        
        return AutoavaliacaoPublica(
            candidate_id=candidate.id,
            candidate_name=candidate.full_name,
            candidate_cpf=cpf_mascarado,
            respostas=respostas_formatadas,
            created_at=autoavaliacao.created_at,
            updated_at=autoavaliacao.updated_at
        )
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Erro ao buscar autoavaliação do candidato: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Erro ao buscar autoavaliação"
        )


@router.get("/admin/todas", response_model=List[AutoavaliacaoPublica])
async def listar_todas_autoavaliacoes(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=500),
    habilidade: Optional[str] = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Lista todas as autoavaliações (apenas admin)
    
    **Acesso**: Apenas admin
    
    **Parâmetros**:
    - skip: Quantos registros pular (padrão: 0)
    - limit: Limite de resultados (padrão: 100, máximo: 500)
    - habilidade: Filtrar por habilidade (busca parcial)
    
    **Exemplo**:
    GET /api/v1/autoavaliacao/admin/todas?habilidade=Python&limit=20
    """
    try:
        # Validar admin
        if current_user.user_type != UserType.admin:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Apenas administradores podem acessar este recurso"
            )
        
        # Buscar autoavaliações
        query = db.query(Autoavaliacao)
        
        # Filtro opcional por habilidade (busca em JSON)
        if habilidade:
            # SQLAlchemy JSON filter
            query = query.filter(
                Autoavaliacao.respostas.astext.ilike(f"%{habilidade}%")
            )
        
        total = query.count()
        autoavaliacoes = query.order_by(Autoavaliacao.updated_at.desc()).offset(skip).limit(limit).all()
        
        # Formatar resposta
        result = []
        for auto in autoavaliacoes:
            candidate = db.query(Candidate).filter(
                Candidate.id == auto.candidate_id
            ).first()
            
            if not candidate:
                continue
            
            respostas_formatadas = [
                HabilidadeAutoavaliacao(**r)
                for r in auto.respostas
            ]
            
            cpf_mascarado = f"{candidate.cpf[:3]}.***.{candidate.cpf[-2:]}"
            
            result.append(AutoavaliacaoPublica(
                candidate_id=candidate.id,
                candidate_name=candidate.full_name,
                candidate_cpf=cpf_mascarado,
                respostas=respostas_formatadas,
                created_at=auto.created_at,
                updated_at=auto.updated_at
            ))
        
        logger.info(f"Admin {current_user.id} listou {len(result)} autoavaliações")
        return result
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Erro ao listar autoavaliações: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Erro ao listar autoavaliações"
        )


@router.delete("/deletar")
async def deletar_autoavaliacao(
    candidate: Candidate = Depends(get_current_candidate),
    db: Session = Depends(get_db)
):
    """
    Deleta a autoavaliação do candidato autenticado
    
    **Acesso**: Apenas o próprio candidato
    """
    try:
        autoavaliacao = db.query(Autoavaliacao).filter(
            Autoavaliacao.candidate_id == candidate.id
        ).first()
        
        if not autoavaliacao:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Autoavaliação não encontrada"
            )
        
        db.delete(autoavaliacao)
        db.commit()
        
        logger.info(f"Autoavaliação deletada para candidato {candidate.id}")
        
        return {"message": "Autoavaliação deletada com sucesso"}
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Erro ao deletar autoavaliação: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Erro ao deletar autoavaliação"
        )


# ============================================================================
# ENDPOINTS PARA EMPRESAS - Filtros e Consultas
# ============================================================================

@router.get("/empresa/filtrar-candidatos")
async def filtrar_candidatos_por_competencia(
    habilidade: str = Query(..., description="Nome da habilidade para filtrar"),
    nivel_minimo: int = Query(1, ge=0, le=4, description="Nível mínimo de proficiência (0-4)"),
    nivel_maximo: int = Query(4, ge=0, le=4, description="Nível máximo de proficiência (0-4)"),
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=200),
    company: Company = Depends(get_current_company),
    db: Session = Depends(get_db)
):
    """
    Filtra candidatos por competência e nível de proficiência
    
    **Acesso**: Apenas empresas autenticadas
    
    **Parâmetros**:
    - habilidade: Nome da habilidade (ex: Python, React, SQL)
    - nivel_minimo: Nível mínimo desejado (0-4)
    - nivel_maximo: Nível máximo desejado (0-4)
    
    **Retorno**: Lista de candidatos que declararam ter a competência no nível especificado
    (dados anonimizados até a empresa demonstrar interesse)
    """
    try:
        # Buscar autoavaliações que contenham a habilidade
        query = db.query(Autoavaliacao).filter(
            Autoavaliacao.respostas.astext.ilike(f"%{habilidade}%")
        )
        
        autoavaliacoes = query.offset(skip).limit(limit).all()
        
        # Filtrar por nível
        resultado = []
        for auto in autoavaliacoes:
            for resposta in auto.respostas:
                if (resposta.get("habilidade", "").lower() == habilidade.lower() and 
                    nivel_minimo <= resposta.get("nivel", 0) <= nivel_maximo):
                    
                    candidate = db.query(Candidate).filter(
                        Candidate.id == auto.candidate_id
                    ).first()
                    
                    if not candidate:
                        continue
                    
                    # Calcular média de níveis
                    niveis = [r.get("nivel", 0) for r in auto.respostas]
                    media_nivel = sum(niveis) / len(niveis) if niveis else 0
                    
                    resultado.append({
                        "candidate_id": candidate.id,
                        "uuid_anonimo": f"CAND-{str(candidate.id).zfill(6)}",
                        "habilidade": resposta.get("habilidade"),
                        "nivel": resposta.get("nivel"),
                        "nivel_nome": ESCALA_PROFICIENCIA.get(resposta.get("nivel", 0), {}).get("nome", "Desconhecido"),
                        "descricao": resposta.get("descricao"),
                        "anos_experiencia": resposta.get("anos_experiencia"),
                        "media_nivel_geral": round(media_nivel, 2),
                        "total_competencias": len(auto.respostas),
                        "estado": candidate.estado,
                        "cidade": candidate.cidade
                    })
                    break  # Não duplicar o mesmo candidato
        
        return {
            "total": len(resultado),
            "habilidade_filtrada": habilidade,
            "nivel_minimo": nivel_minimo,
            "nivel_maximo": nivel_maximo,
            "candidatos": resultado
        }
    
    except Exception as e:
        logger.error(f"Erro ao filtrar candidatos: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Erro ao filtrar candidatos"
        )


@router.get("/empresa/estatisticas")
async def obter_estatisticas_autoavaliacoes(
    company: Company = Depends(get_current_company),
    db: Session = Depends(get_db)
):
    """
    Retorna estatísticas gerais das autoavaliações para a empresa
    
    **Acesso**: Apenas empresas autenticadas
    
    **Retorno**: Estatísticas agregadas sobre competências e níveis dos candidatos
    """
    try:
        # Total de autoavaliações
        total_autoavaliacoes = db.query(Autoavaliacao).count()
        
        # Buscar todas as autoavaliações para análise
        autoavaliacoes = db.query(Autoavaliacao).all()
        
        # Agregar estatísticas
        habilidades_count = {}
        niveis_distribuicao = {0: 0, 1: 0, 2: 0, 3: 0, 4: 0}
        total_declaracoes = 0
        
        for auto in autoavaliacoes:
            for resposta in auto.respostas:
                hab = resposta.get("habilidade", "Desconhecida")
                nivel = resposta.get("nivel", 0)
                
                # Contagem por habilidade
                if hab not in habilidades_count:
                    habilidades_count[hab] = {"total": 0, "niveis": {0: 0, 1: 0, 2: 0, 3: 0, 4: 0}}
                habilidades_count[hab]["total"] += 1
                habilidades_count[hab]["niveis"][nivel] = habilidades_count[hab]["niveis"].get(nivel, 0) + 1
                
                # Distribuição geral de níveis
                niveis_distribuicao[nivel] = niveis_distribuicao.get(nivel, 0) + 1
                total_declaracoes += 1
        
        # Top 10 habilidades mais declaradas
        top_habilidades = sorted(
            habilidades_count.items(), 
            key=lambda x: x[1]["total"], 
            reverse=True
        )[:10]
        
        return {
            "total_candidatos_com_autoavaliacao": total_autoavaliacoes,
            "total_declaracoes_competencia": total_declaracoes,
            "distribuicao_niveis": {
                nivel: {
                    "quantidade": quantidade,
                    "percentual": round((quantidade / total_declaracoes * 100) if total_declaracoes > 0 else 0, 2),
                    "nome": ESCALA_PROFICIENCIA.get(nivel, {}).get("nome", "Desconhecido")
                }
                for nivel, quantidade in niveis_distribuicao.items()
            },
            "top_habilidades": [
                {
                    "habilidade": hab,
                    "total_candidatos": dados["total"],
                    "distribuicao_niveis": dados["niveis"]
                }
                for hab, dados in top_habilidades
            ],
            "escala_referencia": ESCALA_PROFICIENCIA
        }
    
    except Exception as e:
        logger.error(f"Erro ao obter estatísticas: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Erro ao obter estatísticas"
        )


@router.get("/empresa/candidatos-por-vaga/{vaga_id}")
async def obter_candidatos_autoavaliados_por_vaga(
    vaga_id: int,
    nivel_minimo: int = Query(1, ge=0, le=4),
    company: Company = Depends(get_current_company),
    db: Session = Depends(get_db)
):
    """
    Retorna candidatos que se autoavaliaram nas competências requeridas por uma vaga
    
    **Acesso**: Apenas empresas autenticadas (dona da vaga)
    
    **Retorno**: Lista de candidatos com autoavaliação nas competências da vaga
    """
    from app.models.job import Job
    from app.models.competencia import VagaRequisito
    
    try:
        # Verificar se a vaga pertence à empresa
        vaga = db.query(Job).filter(
            Job.id == vaga_id,
            Job.company_id == company.id
        ).first()
        
        if not vaga:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Vaga não encontrada ou não pertence à sua empresa"
            )
        
        # Buscar requisitos da vaga
        requisitos = db.query(VagaRequisito).filter(
            VagaRequisito.vaga_id == vaga_id
        ).all()
        
        habilidades_requeridas = [req.competencia.nome for req in requisitos if req.competencia]
        
        if not habilidades_requeridas:
            return {
                "vaga_id": vaga_id,
                "vaga_titulo": vaga.title,
                "habilidades_requeridas": [],
                "candidatos": [],
                "mensagem": "Nenhuma competência específica definida para esta vaga"
            }
        
        # Buscar candidatos com autoavaliação
        autoavaliacoes = db.query(Autoavaliacao).all()
        
        candidatos_match = []
        for auto in autoavaliacoes:
            match_score = 0
            competencias_match = []
            
            for resposta in auto.respostas:
                hab = resposta.get("habilidade", "").lower()
                nivel = resposta.get("nivel", 0)
                
                for hab_req in habilidades_requeridas:
                    if hab_req.lower() in hab or hab in hab_req.lower():
                        if nivel >= nivel_minimo:
                            match_score += nivel
                            competencias_match.append({
                                "habilidade": resposta.get("habilidade"),
                                "nivel": nivel,
                                "nivel_nome": ESCALA_PROFICIENCIA.get(nivel, {}).get("nome")
                            })
            
            if match_score > 0:
                candidate = db.query(Candidate).filter(
                    Candidate.id == auto.candidate_id
                ).first()
                
                if candidate:
                    candidatos_match.append({
                        "candidate_id": candidate.id,
                        "uuid_anonimo": f"CAND-{str(candidate.id).zfill(6)}",
                        "match_score": match_score,
                        "competencias_match": competencias_match,
                        "total_competencias_candidato": len(auto.respostas),
                        "estado": candidate.estado,
                        "cidade": candidate.cidade
                    })
        
        # Ordenar por match_score
        candidatos_match.sort(key=lambda x: x["match_score"], reverse=True)
        
        return {
            "vaga_id": vaga_id,
            "vaga_titulo": vaga.title,
            "habilidades_requeridas": habilidades_requeridas,
            "nivel_minimo_filtrado": nivel_minimo,
            "total_candidatos": len(candidatos_match),
            "candidatos": candidatos_match[:50]  # Limitar a 50
        }
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Erro ao obter candidatos por vaga: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Erro ao obter candidatos"
        )
