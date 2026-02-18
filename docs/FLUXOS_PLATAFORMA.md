# Fluxos da Plataforma VagaFácil.org

> Documentação completa dos fluxos de Candidatos e Empresas

---

## 📋 Sumário

1. [Visão Geral](#visão-geral)
2. [Fluxo do Candidato](#fluxo-do-candidato)
3. [Fluxo da Empresa](#fluxo-da-empresa)
4. [Pipeline de Seleção (Kanban)](#pipeline-de-seleção-kanban)
5. [Regras de Visibilidade](#regras-de-visibilidade)
6. [Pontos de Notificação](#pontos-de-notificação)
7. [Tempos Esperados](#tempos-esperados)
8. [Fluxo de Pagamento e Garantia](#fluxo-de-pagamento-e-garantia)

---

## Visão Geral

A plataforma VagaFácil conecta candidatos qualificados com empresas através de um processo estruturado de avaliação técnica e match. O fluxo é dividido em etapas bem definidas com regras de privacidade e notificações automatizadas.

### Códigos de Referência

| Código | Descrição |
|--------|-----------|
| **CB** | Cadastro Básico |
| **CA** | Cadastro Avançado |
| **CC** | Cadastro Completo |
| **AV** | Autoavaliação de Competências |
| **TA** | Teste Adaptativo |
| **TT** | Testes Técnicos |
| **PSE** | Pré-Seleção de Empresa |
| **LI** | Liberação de Identidade |
| **EN** | Entrevista |
| **CO** | Contratação |
| **GA** | Garantia |

---

## Fluxo do Candidato

### Diagrama de Estados

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                          FLUXO DO CANDIDATO                                 │
└─────────────────────────────────────────────────────────────────────────────┘

 ┌──────────┐    ┌──────────┐    ┌──────────┐    ┌──────────┐    ┌──────────┐
 │    CB    │───▶│    AV    │───▶│    TA    │───▶│    TT    │───▶│    CC    │
 │ Cadastro │    │  Auto-   │    │  Teste   │    │  Testes  │    │ Cadastro │
 │  Básico  │    │avaliação │    │Adaptativo│    │ Técnicos │    │ Completo │
 └──────────┘    └──────────┘    └──────────┘    └──────────┘    └──────────┘
      │                              │                │               │
      │                              │                │               │
      ▼                              ▼                ▼               ▼
 [Onboarding]                 [Certificação]   [Validação]    [Disponível
                               de Nível         Técnica        para Vagas]
```

### Etapas Detalhadas

#### **CB - Cadastro Básico** (`cadastro_inicial`)

**Dados Coletados:**
- Nome completo
- Email
- CPF
- Senha
- Telefone
- Data de nascimento
- Gênero
- Cidade / Estado
- PCD (sim/não + tipo + adaptações necessárias)

**Regras:**
- CPF único (validação)
- Email único (validação)
- Senha mínimo 6 caracteres
- Campos obrigatórios marcados com *

**Transição:** CB → AV (automática após salvar)

---

#### **AV - Autoavaliação de Competências** (`autoavaliacao_pendente` → `autoavaliacao_concluida`)

**Processo:**
1. Seleção de área(s) de atuação:
   - Automação Industrial
   - Caldeiraria e Solda
   - Elétrica
   - Instrumentação
   - Mecânica

2. Autoavaliação por competência (escala 1-5):
   - 1 = Não tenho experiência
   - 2 = Conhecimento básico
   - 3 = Experiência intermediária
   - 4 = Experiência avançada
   - 5 = Especialista

**Competências por Área:**

| Área | Exemplos de Competências |
|------|-------------------------|
| Automação | CLP/PLC, DCS, SCADA, IHM, Redes Industriais, Segurança Funcional |
| Caldeiraria | Processos de Solda, Fabricação Estruturas, Caldeiraria |
| Elétrica | Instalações, Distribuição, Controle Elétrico |
| Instrumentação | Sensores, Transmissores, Laços de Medição |
| Mecânica | Componentes Mecânicos, Máquinas Rotativas, Fabricação |

**Transição:** AV → TA (automática após conclusão)

---

#### **TA - Teste Adaptativo** (`testes_pendentes`)

**Funcionamento:**
- Algoritmo CAT (Computerized Adaptive Testing)
- Questões ajustam dificuldade baseado em acertos/erros
- Máximo 20 questões por área
- Tempo limite: 45 minutos

**Resultado:**
- Nível certificado: Júnior, Pleno ou Sênior
- Percentil comparativo
- Áreas de força/melhoria

**Transição:** TA → TT (se aplicável) ou CC (se sem testes específicos)

---

#### **TT - Testes Técnicos** (`testes_pendentes` → `testes_concluidos`)

**Tipos:**
- Testes de conhecimento técnico específico
- Resolução de problemas práticos
- Estudos de caso

**Status:**
```python
class StatusTesteCandidato(str, enum.Enum):
    PENDENTE = "pendente"
    EM_ANDAMENTO = "em_andamento"
    CONCLUIDO = "concluido"
```

**Transição:** TT → CC (após todos testes concluídos)

---

#### **CC - Cadastro Completo** (`onboarding_concluido`)

**Dados Adicionais (opcionais):**
- Currículo (upload PDF)
- Foto de perfil
- Formações acadêmicas
- Experiências profissionais
- Certificações
- Pretensão salarial

**Status:** Candidato disponível para matching com vagas

---

## Fluxo da Empresa

### Diagrama de Estados

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                          FLUXO DA EMPRESA                                   │
└─────────────────────────────────────────────────────────────────────────────┘

 ┌──────────┐    ┌──────────┐    ┌──────────┐    ┌──────────┐    ┌──────────┐
 │ Cadastro │───▶│ Criação  │───▶│  Match   │───▶│ Seleção  │───▶│Contrata- │
 │ Empresa  │    │  Vaga    │    │Candidatos│    │ Kanban   │    │   ção    │
 └──────────┘    └──────────┘    └──────────┘    └──────────┘    └──────────┘
      │                              │                │               │
      │                              │                │               │
      ▼                              ▼                ▼               ▼
 [Validação                  [Automático]        [Pipeline]     [Pagamento
  CNPJ]                                                          + Garantia]
```

### Etapas Detalhadas

#### **Cadastro da Empresa**

**Dados Coletados:**
- Email
- Senha + Confirmação
- Razão Social
- Nome Fantasia
- CNPJ (validação)
- Setor de atuação

**Regras:**
- CNPJ único e válido
- Email corporativo preferencial
- Senha mínimo 6 caracteres

---

#### **Criação de Vaga**

**Dados da Vaga:**
- Título
- Descrição
- Requisitos técnicos
- Área de atuação
- Nível (Júnior/Pleno/Sênior)
- Faixa salarial (opcional)
- Localização
- Modelo (Presencial/Remoto/Híbrido)
- Benefícios

**Filtros de Candidatos:**
- Competências mínimas
- Nota mínima nos testes
- Experiência mínima
- Região/Cidade

---

#### **Match de Candidatos**

**Algoritmo de Match:**
1. Filtrar por área de atuação
2. Aplicar filtros da vaga (competências, nível, região)
3. Ranquear por:
   - Score de competências
   - Resultado dos testes
   - Aderência ao perfil

**Resultado:** Lista de candidatos **anônimos** ordenados por fit

---

## Pipeline de Seleção (Kanban)

### Estados do Kanban

```python
class StatusKanbanCandidato(str, enum.Enum):
    AVALIACAO_COMPETENCIAS = "avaliacao_competencias"    # Coluna 1
    TESTES_REALIZADOS = "testes_realizados"              # Coluna 2
    TESTES_NAO_REALIZADOS = "testes_nao_realizados"      # Coluna 2b
    INTERESSE_EMPRESA = "interesse_empresa"              # Coluna 3
    ENTREVISTA_ACEITA = "entrevista_aceita"              # Coluna 4
    REJEITADO = "rejeitado"                              # Coluna 5
```

### Diagrama de Transições

```
                         ┌──────────────────────────────────────┐
                         │                                      │
                         ▼                                      │
┌─────────────────┐   ┌─────────────────┐   ┌─────────────────┐ │
│   AVALIAÇÃO     │   │    TESTES       │   │   INTERESSE     │ │
│  COMPETÊNCIAS   │──▶│   REALIZADOS    │──▶│    EMPRESA      │─┘
│                 │   │                 │   │                 │
│ [Candidatos     │   │ [Candidatos     │   │ [Empresa        │
│  com perfil]    │   │  certificados]  │   │  demonstrou     │
│                 │   │                 │   │  interesse]     │
└────────┬────────┘   └────────┬────────┘   └────────┬────────┘
         │                     │                     │
         │                     │                     │
         ▼                     ▼                     ▼
┌─────────────────┐   ┌─────────────────┐   ┌─────────────────┐
│    TESTES NÃO   │   │    REJEITADO    │   │   ENTREVISTA    │
│   REALIZADOS    │   │                 │   │     ACEITA      │
│                 │   │ [Eliminado do   │   │                 │
│ [Aguardando     │   │  processo]      │   │ [Candidato      │
│  conclusão]     │   │                 │   │  aceitou e      │
│                 │   │                 │   │  dados          │
└─────────────────┘   └─────────────────┘   │  liberados]     │
                                            └────────┬────────┘
                                                     │
                                                     ▼
                                            ┌─────────────────┐
                                            │   CONTRATADO    │
                                            │                 │
                                            │ [Processo       │
                                            │  finalizado     │
                                            │  com sucesso]   │
                                            └─────────────────┘
```

### Transições Permitidas

| De | Para | Trigger | Ação |
|----|------|---------|------|
| AVALIACAO_COMPETENCIAS | TESTES_REALIZADOS | Candidato completa testes | Automático |
| AVALIACAO_COMPETENCIAS | TESTES_NAO_REALIZADOS | Timeout de testes | Automático |
| TESTES_REALIZADOS | INTERESSE_EMPRESA | Empresa clica "Demonstrar Interesse" | Manual |
| INTERESSE_EMPRESA | ENTREVISTA_ACEITA | Candidato aceita entrevista | Manual (candidato) |
| INTERESSE_EMPRESA | REJEITADO | Candidato recusa ou timeout | Manual/Automático |
| ENTREVISTA_ACEITA | CONTRATADO | Empresa confirma contratação | Manual |
| Qualquer estado | REJEITADO | Empresa rejeita candidato | Manual |

---

## Regras de Visibilidade

### Princípio de Sigilo

A plataforma opera com **sigilo de identidade** até o aceite mútuo:

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                      VISIBILIDADE DO CANDIDATO                              │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│   ANTES do Aceite              │          APÓS o Aceite                     │
│   ─────────────────            │          ────────────────                  │
│                                │                                            │
│   ✓ Área de atuação           │          ✓ Nome completo                   │
│   ✓ Nível (Jr/Pl/Sr)          │          ✓ Email                           │
│   ✓ Competências (scores)     │          ✓ Telefone                        │
│   ✓ Resultado dos testes      │          ✓ CPF                             │
│   ✓ Cidade/Estado             │          ✓ Currículo completo              │
│   ✓ Anos de experiência       │          ✓ Foto de perfil                  │
│   ✓ Formação (nível)          │          ✓ Histórico profissional          │
│   ✓ PCD (sim/não)             │          ✓ Todas informações               │
│                                │                                            │
│   ✗ Nome                      │                                            │
│   ✗ CPF                       │                                            │
│   ✗ Email                     │                                            │
│   ✗ Telefone                  │                                            │
│   ✗ Foto                      │                                            │
│                                │                                            │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Campos no Banco de Dados

```python
# VagaCandidato
consentimento_entrevista = Column(Boolean, default=False)
data_consentimento = Column(DateTime, nullable=True)
dados_pessoais_liberados = Column(Boolean, default=False)  # Auto quando consentimento=True
```

### Fluxo de Liberação (LI)

```
┌─────────────┐         ┌─────────────┐         ┌─────────────┐
│   Empresa   │         │  Candidato  │         │   Empresa   │
│ demonstra   │────────▶│   recebe    │────────▶│   recebe    │
│  interesse  │         │ notificação │         │   dados     │
│             │         │  e ACEITA   │         │  completos  │
└─────────────┘         └──────┬──────┘         └─────────────┘
                               │
                               │ Se RECUSA
                               ▼
                        ┌─────────────┐
                        │  Candidato  │
                        │   volta a   │
                        │   piscina   │
                        └─────────────┘
```

---

## Pontos de Notificação

### Matriz de Notificações

| Evento | Email | Push App | Destinatário | Template |
|--------|-------|----------|--------------|----------|
| **Cadastro concluído** | ✅ | ✅ | Candidato | `welcome_candidate` |
| **Cadastro empresa** | ✅ | ✅ | Empresa | `welcome_company` |
| **Autoavaliação concluída** | ✅ | ✅ | Candidato | `assessment_completed` |
| **Testes disponíveis** | ✅ | ✅ | Candidato | `tests_available` |
| **Teste concluído** | ✅ | ✅ | Candidato | `test_completed` |
| **Certificação obtida** | ✅ | ✅ | Candidato | `certification_earned` |
| **Vaga publicada** | ❌ | ❌ | - | - |
| **Match encontrado** | ✅ | ✅ | Candidato | `new_match` |
| **Empresa demonstrou interesse** | ✅ | ✅ | Candidato | `company_interest` |
| **Candidato aceitou entrevista** | ✅ | ✅ | Empresa | `candidate_accepted` |
| **Candidato recusou** | ✅ | ❌ | Empresa | `candidate_declined` |
| **Entrevista agendada** | ✅ | ✅ | Ambos | `interview_scheduled` |
| **Lembrete de entrevista** | ✅ | ✅ | Ambos | `interview_reminder` |
| **Contratação confirmada** | ✅ | ✅ | Candidato | `hired_confirmation` |
| **Pagamento pendente** | ✅ | ❌ | Empresa | `payment_pending` |
| **Pagamento confirmado** | ✅ | ✅ | Empresa | `payment_confirmed` |
| **Início da garantia** | ✅ | ❌ | Empresa | `warranty_started` |
| **Fim da garantia** | ✅ | ❌ | Empresa | `warranty_ended` |
| **Reembolso solicitado** | ✅ | ✅ | Admin | `refund_requested` |

### Detalhamento por Evento

#### Empresa Demonstrou Interesse

**Para:** Candidato

**Canal:** Email + Push

**Conteúdo:**
```
Assunto: Uma empresa quer conhecer você! 🎉

Olá [Nome],

Uma empresa demonstrou interesse no seu perfil para a vaga de [Cargo].

Área: [Área]
Local: [Cidade/Estado]
Modelo: [Presencial/Remoto/Híbrido]

Você tem 48 horas para aceitar ou recusar.

[Botão: Ver Detalhes e Responder]

---
Se você aceitar, seus dados pessoais serão compartilhados 
com a empresa para agendamento de entrevista.
```

#### Candidato Aceitou Entrevista

**Para:** Empresa

**Canal:** Email + Push

**Conteúdo:**
```
Assunto: Candidato aceitou entrevista para [Vaga]

Olá [Nome da Empresa],

O candidato [Nome do Candidato] aceitou seu convite para entrevista!

📋 Dados do Candidato:
- Nome: [Nome Completo]
- Email: [Email]
- Telefone: [Telefone]
- Nível: [Júnior/Pleno/Sênior]

📄 Currículo em anexo

[Botão: Agendar Entrevista]
```

---

## Tempos Esperados

### SLAs por Etapa

| Etapa | Tempo Esperado | Tempo Máximo | Ação se Exceder |
|-------|----------------|--------------|-----------------|
| **Cadastro Básico** | 5 min | 15 min | - |
| **Seleção de Área** | 2 min | 5 min | - |
| **Autoavaliação** | 10-15 min | 30 min | - |
| **Teste Adaptativo** | 20-30 min | 45 min | Encerramento automático |
| **Testes Técnicos** | 30-60 min | 90 min | Encerramento automático |
| **Resposta ao interesse** | 24h | 48h | Notificação de lembrete |
| **Agendamento entrevista** | 48h | 7 dias | Alerta para empresa |
| **Realização entrevista** | 7 dias | 14 dias | - |
| **Feedback pós-entrevista** | 48h | 7 dias | Solicitação automática |
| **Confirmação contratação** | 7 dias | 30 dias | - |

### Alertas Automáticos

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                          TIMELINE DE ALERTAS                                │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  Interesse Demonstrado                                                      │
│         │                                                                   │
│         ├── 0h ──────▶ Notificação inicial para candidato                  │
│         │                                                                   │
│         ├── 24h ─────▶ Lembrete: "Ainda não respondeu"                     │
│         │                                                                   │
│         ├── 44h ─────▶ Alerta: "Últimas 4 horas para responder"            │
│         │                                                                   │
│         └── 48h ─────▶ Timeout: Candidato volta para pool                  │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Fluxo de Pagamento e Garantia

### Modelo de Negócio

A plataforma opera no modelo **Success Fee** - a empresa só paga quando contrata.

### Estrutura de Preços

| Nível do Candidato | Taxa de Sucesso |
|-------------------|-----------------|
| Júnior | R$ 2.000 - R$ 3.500 |
| Pleno | R$ 3.500 - R$ 6.000 |
| Sênior | R$ 6.000 - R$ 10.000 |

*Valores podem variar por área e região*

### Fluxo de Pagamento

```
┌─────────────┐    ┌─────────────┐    ┌─────────────┐    ┌─────────────┐
│ Contratação │───▶│  Geração    │───▶│  Pagamento  │───▶│   Início    │
│ Confirmada  │    │  Fatura     │    │  Confirmado │    │  Garantia   │
└─────────────┘    └─────────────┘    └─────────────┘    └─────────────┘
      │                   │                  │                  │
      │                   │                  │                  │
      ▼                   ▼                  ▼                  ▼
 [Empresa             [Boleto/          [Liberação        [90 dias de
  confirma no          Pix/             candidato           garantia]
  sistema]            Cartão]           para início]
```

### Política de Garantia

**Período:** 90 dias corridos a partir da data de início do candidato

**Cobertura:**
- Demissão sem justa causa (pela empresa)
- Pedido de demissão (pelo candidato)
- Não adaptação ao cargo

**Não cobre:**
- Demissão por justa causa
- Reestruturação da empresa
- Mudança de escopo da vaga

### Fluxo de Reembolso/Substituição

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                        FLUXO DE GARANTIA                                    │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│   Desligamento durante garantia                                             │
│              │                                                              │
│              ▼                                                              │
│   ┌─────────────────────┐                                                   │
│   │  Empresa notifica   │                                                   │
│   │  plataforma         │                                                   │
│   └──────────┬──────────┘                                                   │
│              │                                                              │
│              ▼                                                              │
│   ┌─────────────────────┐                                                   │
│   │  Análise do caso    │                                                   │
│   │  (até 5 dias úteis) │                                                   │
│   └──────────┬──────────┘                                                   │
│              │                                                              │
│              ├──────────────────────────────────┐                           │
│              ▼                                  ▼                           │
│   ┌─────────────────────┐          ┌─────────────────────┐                  │
│   │  OPÇÃO 1:           │          │  OPÇÃO 2:           │                  │
│   │  Substituição       │          │  Reembolso          │                  │
│   │  Gratuita           │          │  Proporcional       │                  │
│   │                     │          │                     │                  │
│   │  Novo processo de   │          │  Baseado em:        │                  │
│   │  seleção sem custo  │          │  - Dias trabalhados │                  │
│   │  adicional          │          │  - % do período     │                  │
│   └─────────────────────┘          └─────────────────────┘                  │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Tabela de Reembolso Proporcional

| Período | Reembolso |
|---------|-----------|
| 0-30 dias | 100% |
| 31-60 dias | 50% |
| 61-90 dias | 25% |
| > 90 dias | 0% |

---

## Anexos

### A. Status de Onboarding (Código)

```python
class StatusOnboarding(str, enum.Enum):
    CADASTRO_INICIAL = "cadastro_inicial"
    AREA_SELECIONADA = "area_selecionada"
    AUTOAVALIACAO_PENDENTE = "autoavaliacao_pendente"
    AUTOAVALIACAO_CONCLUIDA = "autoavaliacao_concluida"
    TESTES_PENDENTES = "testes_pendentes"
    TESTES_CONCLUIDOS = "testes_concluidos"
    ONBOARDING_CONCLUIDO = "onboarding_concluido"
```

### B. Status do Kanban (Código)

```python
class StatusKanbanCandidato(str, enum.Enum):
    AVALIACAO_COMPETENCIAS = "avaliacao_competencias"
    TESTES_REALIZADOS = "testes_realizados"
    TESTES_NAO_REALIZADOS = "testes_nao_realizados"
    INTERESSE_EMPRESA = "interesse_empresa"
    ENTREVISTA_ACEITA = "entrevista_aceita"
    REJEITADO = "rejeitado"
```

### C. Campos de Privacidade

```python
# VagaCandidato
empresa_demonstrou_interesse = Column(Boolean, default=False)
data_interesse = Column(DateTime, nullable=True)
consentimento_entrevista = Column(Boolean, default=False)
data_consentimento = Column(DateTime, nullable=True)
dados_pessoais_liberados = Column(Boolean, default=False)
```

---

*Documento gerado em: 16/02/2026*
*Versão: 1.0*
