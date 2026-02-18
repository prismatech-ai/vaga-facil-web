"""
Utilitários para anonimização de dados de candidatos
"""
import hashlib
from typing import Optional
from app.models.candidate import Candidate


def gerar_id_anonimo(candidate_id: int, cpf: str) -> str:
    """
    Gera um ID fictício baseado em hash do ID real + CPF
    Garante que o mesmo candidato sempre tenha o mesmo ID anônimo
    
    Args:
        candidate_id: ID real do candidato
        cpf: CPF do candidato
    
    Returns:
        String com ID fictício (ex: CAND-a1b2c3d4)
    """
    # Combinar ID com CPF para criar um hash único
    dados = f"{candidate_id}-{cpf}"
    hash_obj = hashlib.sha256(dados.encode())
    hash_hex = hash_obj.hexdigest()[:8].upper()
    
    return f"CAND-{hash_hex}"


def anonimizar_candidato(candidate: Candidate, db=None) -> dict:
    """
    Converte um objeto Candidate em um dicionário anônimo completo
    Retira todas as informações sensíveis (nome, email, telefone, ID real, CPF, currículo)
    Mantém dados públicos e profissionais
    
    Args:
        candidate: Objeto Candidate do SQLAlchemy
        db: Session do banco (opcional, para buscar relacionamentos)
    
    Returns:
        Dicionário com dados anônimos completos do candidato
    """
    # Formações acadêmicas
    formacoes = []
    if hasattr(candidate, 'formacoes_academicas_rel') and candidate.formacoes_academicas_rel:
        formacoes = [
            {
                "instituicao": f.instituicao,
                "curso": f.curso,
                "nivel": f.nivel,
                "status": f.status,
                "ano_conclusao": f.ano_conclusao
            }
            for f in candidate.formacoes_academicas_rel
        ]
    
    # Notas dos testes
    notas_testes = []
    if hasattr(candidate, 'candidato_testes') and candidate.candidato_testes:
        for ct in candidate.candidato_testes:
            if ct.test and ct.pontuacao is not None:
                notas_testes.append({
                    "habilidade": ct.test.habilidade,
                    "nivel": ct.test.nivel.value if ct.test.nivel else None,
                    "pontuacao": ct.pontuacao,
                    "tempo_decorrido": ct.tempo_decorrido
                })
    
    # Autoavaliação de habilidades
    autoavaliacao = []
    if hasattr(candidate, 'autoavaliacoes_competencias') and candidate.autoavaliacoes_competencias:
        for ac in candidate.autoavaliacoes_competencias:
            if ac.competencia:
                autoavaliacao.append({
                    "habilidade": ac.competencia.nome,
                    "nivel": ac.nivel_declarado,
                    "descricao": None
                })
    
    return {
        # ID anônimo
        "id_anonimo": gerar_id_anonimo(candidate.id, candidate.cpf),
        
        # Dados pessoais (sem identificação)
        "birth_date": candidate.birth_date.isoformat() if candidate.birth_date else None,
        "genero": candidate.genero.value if candidate.genero else None,
        "estado_civil": candidate.estado_civil.value if candidate.estado_civil else None,
        
        # Endereço completo
        "logradouro": candidate.logradouro,
        "numero": candidate.numero,
        "complemento": candidate.complemento,
        "bairro": candidate.bairro,
        "cidade": candidate.cidade,
        "estado": candidate.estado,
        "cep": candidate.cep,
        "location": f"{candidate.cidade}, {candidate.estado}" if candidate.cidade and candidate.estado else None,
        
        # PCD
        "is_pcd": candidate.is_pcd,
        "tipo_pcd": candidate.tipo_pcd.value if candidate.tipo_pcd else None,
        "necessidades_adaptacao": candidate.necessidades_adaptacao,
        
        # Profissional
        "bio": candidate.bio,
        "area_atuacao": candidate.area_atuacao,
        "experiencia_profissional": candidate.experiencia_profissional,
        "formacao_escolaridade": candidate.formacao_escolaridade,
        "habilidades": candidate.habilidades,
        
        # Formações acadêmicas
        "formacoes_academicas": formacoes,
        
        # Testes e avaliações
        "notas_testes": notas_testes,
        "autoavaliacao_habilidades": autoavaliacao,
        "score_teste_habilidades": candidate.score_teste_habilidades,
        
        # Links públicos
        "linkedin_url": candidate.linkedin_url,
        "portfolio_url": candidate.portfolio_url,
        
        # Timestamps
        "criado_em": candidate.created_at
    }
