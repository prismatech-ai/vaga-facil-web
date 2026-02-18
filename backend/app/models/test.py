"""
Modelos de dados para testes técnicos
"""
from sqlalchemy import Column, Integer, String, Text, Boolean, ForeignKey, DateTime, Enum as SQLEnum, JSON, Float
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.core.database import Base
import enum


class TestLevel(str, enum.Enum):
    """Níveis de dificuldade dos testes"""
    iniciante = "Nível 1 - Iniciante"
    basico = "Nível 2 - Básico"
    intermediario = "Nível 3 - Intermediário"
    avancado = "Nível 4 - Avançado"
    expert = "Nível 5 - Expert"


class Test(Base):
    """Modelo para testes técnicos"""
    __tablename__ = "tests"

    id = Column(Integer, primary_key=True, index=True)
    nome = Column(String(200), nullable=False)
    habilidade = Column(String(200), nullable=False)  # Ex: React, Python, JavaScript
    nivel = Column(SQLEnum(TestLevel), nullable=False)
    descricao = Column(Text, nullable=True)
    created_by = Column(Integer, ForeignKey("users.id"), nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    # Relacionamentos
    creator = relationship("User", back_populates="tests_created")
    questions = relationship("Question", back_populates="test", cascade="all, delete-orphan")
    candidato_testes = relationship("CandidatoTeste", back_populates="test", cascade="all, delete-orphan")  # NOVO


class Question(Base):
    """Modelo para questões dos testes"""
    __tablename__ = "questions"

    id = Column(Integer, primary_key=True, index=True)
    test_id = Column(Integer, ForeignKey("tests.id"), nullable=False)
    texto_questao = Column(Text, nullable=False)
    ordem = Column(Integer, nullable=False)  # Ordem da questão no teste
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    # Relacionamentos
    test = relationship("Test", back_populates="questions")
    alternatives = relationship("Alternative", back_populates="question", cascade="all, delete-orphan")


class Alternative(Base):
    """Modelo para alternativas das questões"""
    __tablename__ = "alternatives"

    id = Column(Integer, primary_key=True, index=True)
    question_id = Column(Integer, ForeignKey("questions.id"), nullable=False)
    texto = Column(Text, nullable=False)
    is_correct = Column(Boolean, default=False, nullable=False)
    ordem = Column(Integer, nullable=False)  # Ordem da alternativa (A, B, C, D)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    # Relacionamentos
    question = relationship("Question", back_populates="alternatives")


class AdaptiveTestSession(Base):
    """Modelo para sessões de teste adaptativo em tempo real"""
    __tablename__ = "adaptive_test_sessions"

    id = Column(Integer, primary_key=True, index=True)
    candidate_id = Column(Integer, ForeignKey("candidates.id"), nullable=False)
    habilidade = Column(String(200), nullable=False)  # Ex: Python, React
    
    # Estado atual do teste
    nivel_atual = Column(String(20), nullable=False, default="basico")  # basico, intermediario, avancado
    questao_atual_index = Column(Integer, default=0)  # Índice da questão atual no nível
    
    # Contadores de acertos por nível
    acertos_basico = Column(Integer, default=0)
    total_basico = Column(Integer, default=0)
    acertos_intermediario = Column(Integer, default=0)
    total_intermediario = Column(Integer, default=0)
    acertos_avancado = Column(Integer, default=0)
    total_avancado = Column(Integer, default=0)
    
    # Histórico de respostas (JSON)
    historico_respostas = Column(JSON, nullable=True)  # [{question_id, alternative_id, is_correct, nivel}]
    
    # Estado e resultado final
    is_completed = Column(Boolean, default=False)
    nivel_final_atingido = Column(String(50), nullable=True)  # N0, N1, N2, N3, N4
    pontuacao_final = Column(Float, nullable=True)
    
    # Timestamps
    started_at = Column(DateTime(timezone=True), server_default=func.now())
    completed_at = Column(DateTime(timezone=True), nullable=True)
    
    # Relacionamentos
    candidate = relationship("Candidate", backref="adaptive_test_sessions")

class CandidateTestResult(Base):
    """Modelo para armazenar resultados de testes feitos pelos candidatos"""
    __tablename__ = "candidate_test_results"

    id = Column(Integer, primary_key=True, index=True)
    candidate_id = Column(Integer, ForeignKey("candidates.id"), nullable=False)
    test_id = Column(Integer, ForeignKey("tests.id"), nullable=False)
    
    # Resultados
    total_questoes = Column(Integer, nullable=False)
    total_acertos = Column(Integer, nullable=False)
    percentual_acerto = Column(Float, nullable=False)
    tempo_decorrido = Column(Integer, nullable=True)  # em segundos
    
    # Detalhes das respostas (JSON)
    detalhes_questoes = Column(JSON, nullable=True)
    
    # Timestamps
    submitted_at = Column(DateTime(timezone=True), server_default=func.now())
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    # Relacionamentos
    candidate = relationship("Candidate", backref="test_results")
    test = relationship("Test", backref="candidate_results")


class Autoavaliacao(Base):
    """Modelo para respostas de autoavaliação dos candidatos"""
    __tablename__ = "autoavaliacoes"

    id = Column(Integer, primary_key=True, index=True)
    candidate_id = Column(Integer, ForeignKey("candidates.id"), nullable=False)
    
    # Respostas em JSON (array de habilidades com níveis)
    # Exemplo: [{"habilidade": "Python", "nivel": 4}, {"habilidade": "React", "nivel": 3}]
    respostas = Column(JSON, nullable=False)
    
    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    # Relacionamentos
    candidate = relationship("Candidate", back_populates="autoavaliacoes")