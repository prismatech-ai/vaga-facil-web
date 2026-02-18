// Escala de Proficiência Universal
export const ESCALA_PROFICIENCIA = {
  "N0": "Não exposto: nunca executou ou não conhece",
  "N1": "Básico: conhece conceitos fundamentais; executa com supervisão e seguindo procedimentos",
  "N2": "Intermediário: executa rotineiramente com autonomia parcial; reconhece anomalias comuns",
  "N3": "Avançado: executa com autonomia plena, padroniza práticas e treina pares; resolve falhas não triviais",
  "N4": "Expert: referência técnica; define padrões, audita, investiga causas crônicas e lidera melhorias"
} as const

export type NivelProficiencia = keyof typeof ESCALA_PROFICIENCIA

export interface Competencia {
  nome: string
  categoria: string
  descricao?: string
  niveis?: {
    [key in NivelProficiencia]?: string
  }
}

export interface CompetenciasPorCategoria {
  [categoria: string]: Competencia[]
}

// ============================================
// MECÂNICA NA MANUTENÇÃO INDUSTRIAL
// ============================================

const MECANICA_CONHECIMENTO_TECNICO: Competencia[] = [
  {
    nome: "Componentes mecânicos",
    categoria: "Mecânica - Conhecimento Técnico",
    descricao: "Redutores, bombas, compressores, ventiladores, trocadores, válvulas, acoplamentos, mancais, eixos, engrenagens, correias/correntes",
    niveis: {
      "N1": "Identifica tipos e funções; reconhece nomenclaturas básicas",
      "N2": "Relaciona sintomas a componentes (cavitação em bombas, gripagem de rolamentos)",
      "N3": "Especifica substitutos equivalentes, ajustes e folgas típicas",
      "N4": "Seleciona tecnicamente componentes para serviço e define critérios de aceitação"
    }
  },
  {
    nome: "Rolamentos e mancais",
    categoria: "Mecânica - Conhecimento Técnico",
    descricao: "Tipos, especificações e manutenção de rolamentos e mancais",
    niveis: {
      "N1": "Conhece tipos e lubrificação básica",
      "N2": "Monta/desmonta com ferramentas corretas; ajusta folgas",
      "N3": "Interpreta padrões de falha e define vida útil",
      "N4": "Reavalia especificações e padroniza critérios de seleção"
    }
  },
  {
    nome: "Selagem (selos mecânicos, gaxetas, retentores)",
    categoria: "Mecânica - Conhecimento Técnico",
    descricao: "Tipos de selagem dinâmica e estática, análise de vazamentos",
    niveis: {
      "N1": "Diferencia selagem dinâmica e estática",
      "N2": "Executa substituições conforme procedimento",
      "N3": "Analisa causas de vazamentos prematuros",
      "N4": "Padroniza planos de selagem e flushing"
    }
  },
  {
    nome: "Engrenagens",
    categoria: "Mecânica - Conhecimento Técnico",
    niveis: {
      "N1": "Identifica tipos básicos e funções",
      "N2": "Reconhece anomalias e desgastes típicos",
      "N3": "Especifica engrenagens equivalentes e folgas",
      "N4": "Define critérios de aceitação e padrões de engrenamento"
    }
  },
  {
    nome: "Acoplamentos",
    categoria: "Mecânica - Conhecimento Técnico",
    niveis: {
      "N1": "Conhece tipos e aplicações básicas",
      "N2": "Executa trocas conforme procedimento",
      "N3": "Analisa desalinhamentos e elasticidades",
      "N4": "Especifica acoplamentos e define critérios de flexibilidade"
    }
  },
  {
    nome: "Materiais metálicos e propriedades",
    categoria: "Mecânica - Conhecimento Técnico",
    niveis: {
      "N1": "Reconhece tipos de aço, ferro fundido, alumínio",
      "N2": "Relaciona propriedades a aplicações",
      "N3": "Interpreta gráficos de dureza e tensão",
      "N4": "Especifica ligas e tratamentos térmicos"
    }
  },
  {
    nome: "Metrologia e tolerâncias",
    categoria: "Mecânica - Conhecimento Técnico",
    niveis: {
      "N1": "Lê desenhos com cotas e tolerâncias básicas",
      "N2": "Mede com paquímetro e micrômetro; reconhece desvios",
      "N3": "Interpreta especificações geométricas; usa calibres",
      "N4": "Define tolerâncias e critérios de aceitação"
    }
  },
  {
    nome: "Desenho técnico e simbologia",
    categoria: "Mecânica - Conhecimento Técnico",
    niveis: {
      "N1": "Lê desenhos em perspectiva e vistas",
      "N2": "Localiza cotas, tolerâncias e referências",
      "N3": "Interpreta símbolos geométricos (perpendicularidade, concentricidade)",
      "N4": "Analisa desenhos complexos e orienta interpretações"
    }
  }
]

const MECANICA_MANUTENCAO: Competencia[] = [
  {
    nome: "Manutenção preventiva",
    categoria: "Mecânica - Habilidades de Manutenção",
    niveis: {
      "N1": "Executa tarefas simples conforme plano (inspeção visual, limpeza)",
      "N2": "Reconhece anomalias em rotina; executa checklist completo",
      "N3": "Planeja sequências e otimiza intervalos",
      "N4": "Define estratégias de prevenção e reavalia planos"
    }
  },
  {
    nome: "Manutenção corretiva",
    categoria: "Mecânica - Habilidades de Manutenção",
    niveis: {
      "N1": "Executa reparos simples com orientação",
      "N2": "Diagnostica problemas comuns; repara com procedimento",
      "N3": "Resolve falhas não-triviais de forma autônoma",
      "N4": "Investiga causas crônicas e implanta melhorias"
    }
  },
  {
    nome: "Montagem e desmontagem",
    categoria: "Mecânica - Habilidades de Manutenção",
    niveis: {
      "N1": "Desmonta/monta com supervisão; segue sequência",
      "N2": "Executa procedimentos padrão; usa ferramentas corretas",
      "N3": "Improvisa abordagens seguras; treina pares",
      "N4": "Padroniza procedimentos e define critérios de qualidade"
    }
  },
  {
    nome: "Torque e tensionamento",
    categoria: "Mecânica - Habilidades de Manutenção",
    niveis: {
      "N1": "Conhece tabelas; aperta com chave dinamométrica",
      "N2": "Reconhece sequência de torque; valida com gabarito",
      "N3": "Ajusta para condições; usa pretensionamento",
      "N4": "Define torques críticos e estabelece procedimentos"
    }
  },
  {
    nome: "Manutenção de bombas",
    categoria: "Mecânica - Habilidades de Manutenção",
    niveis: {
      "N1": "Identifica falhas (cavitação, vazamento); reposiçiona",
      "N2": "Executa troca de selos, rolamentos com procedimento",
      "N3": "Realinha impelidor; interpreta curvas",
      "N4": "Especifica bombas e define critérios de aceitação"
    }
  },
  {
    nome: "Manutenção de redutores",
    categoria: "Mecânica - Habilidades de Manutenção",
    niveis: {
      "N1": "Reconhece tipos; troca óleo com procedimento",
      "N2": "Interpreta vibrações; coleta amostra de óleo",
      "N3": "Diagnostica desgaste de engrenagens",
      "N4": "Define estratégia de manutenção e especifica marcas"
    }
  },
  {
    nome: "Manutenção hidráulica e pneumática",
    categoria: "Mecânica - Habilidades de Manutenção",
    niveis: {
      "N1": "Identifica componentes; segue procedimento de troca",
      "N2": "Executa manutenção conforme plano; limpa filtros",
      "N3": "Diagnostica vazamentos e pressões anormais",
      "N4": "Dimensiona sistemas e define padrões"
    }
  },
  {
    nome: "Ensaios não destrutivos (END)",
    categoria: "Mecânica - Habilidades de Manutenção",
    niveis: {
      "N1": "Conhece tipos (VT, UT, RT, MT); observa execução",
      "N2": "Prepara superfícies; auxilia inspetor",
      "N3": "Interpreta resultados; correlaciona com defeitos",
      "N4": "Qualifica procedimentos; supervisiona ensaios"
    }
  },
  {
    nome: "Comissionamento e start-up",
    categoria: "Mecânica - Habilidades de Manutenção",
    niveis: {
      "N1": "Auxilia em testes; segue checklist",
      "N2": "Executa testes de funcionamento e segurança",
      "N3": "Diagnostica anomalias em equipamentos novos",
      "N4": "Coordena comissionamento; define pontos críticos"
    }
  }
]

const MECANICA_LUBRIFICACAO: Competencia[] = [
  {
    nome: "Fundamentos de lubrificação",
    categoria: "Mecânica - Lubrificação",
    niveis: {
      "N1": "Conhece tipos de lubrificantes (mineral, sintético)",
      "N2": "Entende viscosidade, ponto de fulgor; seleciona SAE",
      "N3": "Interpreta especificações (API, AGMA) e aditivos",
      "N4": "Define estratégias de lubrificação; audita fornecedores"
    }
  },
  {
    nome: "Boas práticas (5R da Lubrificação)",
    categoria: "Mecânica - Lubrificação",
    descricao: "Lubrificante certo, quantidade certa, local certo, momento certo, procedimento certo",
    niveis: {
      "N1": "Conhece os 5R; segue procedimento",
      "N2": "Executa relubrificação conforme plano",
      "N3": "Otimiza frequências e dosagens",
      "N4": "Implementa programa de lubrificação eficiente"
    }
  },
  {
    nome: "Análise de óleo",
    categoria: "Mecânica - Lubrificação",
    niveis: {
      "N1": "Coleta amostra conforme procedimento",
      "N2": "Interpreta relatório básico (viscosidade, água)",
      "N3": "Analisa tendências; associa resultados a falhas",
      "N4": "Define estratégia preditiva; estabelece limites"
    }
  },
  {
    nome: "Sistemas de lubrificação centralizada",
    categoria: "Mecânica - Lubrificação",
    niveis: {
      "N1": "Identifica componentes do sistema",
      "N2": "Executa manutenção conforme manual",
      "N3": "Diagnostica falhas de bomba e solenoide",
      "N4": "Dimensiona sistemas centralizados"
    }
  }
]

const MECANICA_ALINHAMENTO: Competencia[] = [
  {
    nome: "Alinhamento de eixos",
    categoria: "Mecânica - Alinhamento e Balanceamento",
    niveis: {
      "N1": "Conhece causas de desalinhamento; usa régua",
      "N2": "Alinha com relógio comparador; registra medições",
      "N3": "Analisa gráficos de alinhamento; alinha em carga",
      "N4": "Define tolerâncias; supervisiona alinhamentos críticos"
    }
  },
  {
    nome: "Alinhamento de polias",
    categoria: "Mecânica - Alinhamento e Balanceamento",
    niveis: {
      "N1": "Reconhece desalinhamento visual",
      "N2": "Alinha com corda; ajusta altura",
      "N3": "Usa sensor; otimiza para vibração",
      "N4": "Especifica tolerâncias; padroniza alinhamentos"
    }
  },
  {
    nome: "Balanceamento de rotores",
    categoria: "Mecânica - Alinhamento e Balanceamento",
    niveis: {
      "N1": "Reconhece desbalanceamento por vibração",
      "N2": "Prepara rotor; auxilia técnico de balanceamento",
      "N3": "Interpreta gráficos; adiciona/remove massa",
      "N4": "Dimensiona balanceamento; qualifica máquinas"
    }
  }
]

const MECANICA_SEGURANCA: Competencia[] = [
  {
    nome: "LOTO (Lockout/Tagout)",
    categoria: "Mecânica - Normas e Segurança",
    descricao: "Bloqueio e etiquetagem de energia em manutenção",
    niveis: {
      "N1": "Conhece princípios; segue procedimento",
      "N2": "Executa bloqueio conforme checklist",
      "N3": "Valida bloqueio; orienta equipe",
      "N4": "Define procedimentos LOTO; audita conformidade"
    }
  },
  {
    nome: "NR-12 (Segurança em máquinas)",
    categoria: "Mecânica - Normas e Segurança",
    niveis: {
      "N1": "Conhece conceitos básicos (guarda, parada de emergência)",
      "N2": "Executa manutenção respeitando proteções",
      "N3": "Analisa riscos; sugere melhorias",
      "N4": "Implementa medidas de segurança; inspeciona conformidade"
    }
  },
  {
    nome: "NR-13 (Segurança em caldeiras e vasos de pressão)",
    categoria: "Mecânica - Normas e Segurança",
    niveis: {
      "N1": "Conhece categorias de caldeiras",
      "N2": "Executa testes simples (válvula de segurança)",
      "N3": "Interpreta inspeções; coordena testes",
      "N4": "Define estratégias de inspeção; inspeciona equipamentos"
    }
  },
  {
    nome: "Trabalho a quente",
    categoria: "Mecânica - Normas e Segurança",
    niveis: {
      "N1": "Conhece proibições; segue procedimento",
      "N2": "Executa tarefas com permissão; monitora risco",
      "N3": "Emite permissão; valida conformidade",
      "N4": "Define procedimentos de trabalho a quente"
    }
  },
  {
    nome: "Espaços confinados",
    categoria: "Mecânica - Normas e Segurança",
    niveis: {
      "N1": "Conhece riscos; não entra sem orientação",
      "N2": "Executa tarefas com procedimento; auxilia observador",
      "N3": "Emite permissão; coordena resgate",
      "N4": "Define procedimentos; treina equipe"
    }
  },
  {
    nome: "Trabalho em altura",
    categoria: "Mecânica - Normas e Segurança",
    niveis: {
      "N1": "Conhece EPI; segue procedimento",
      "N2": "Executa tarefas em altura com segurança",
      "N3": "Inspeciona EPI; orienta equipe",
      "N4": "Define procedimentos de trabalho em altura"
    }
  }
]

// ============================================
// INSTRUMENTAÇÃO NA MANUTENÇÃO INDUSTRIAL
// ============================================

const INSTRUMENTACAO_CONHECIMENTO: Competencia[] = [
  {
    nome: "Princípios de medição",
    categoria: "Instrumentação - Conhecimento Técnico",
    niveis: {
      "N1": "Conhece unidades e grandezas básicas",
      "N2": "Entende incerteza; interpreta especificações",
      "N3": "Calcula incerteza; valida medições",
      "N4": "Define estratégias metrológicas; estabelece padrões"
    }
  },
  {
    nome: "Tecnologias de sensores",
    categoria: "Instrumentação - Conhecimento Técnico",
    descricao: "Sensores de pressão, temperatura, vazão, nível, composição",
    niveis: {
      "N1": "Identifica tipos de sensores; conhece saídas (4-20 mA)",
      "N2": "Reconhece anomalias; interpreta sinal",
      "N3": "Especifica sensores; analisa faixa operacional",
      "N4": "Define tecnologia para aplicação; estabelece critérios"
    }
  },
  {
    nome: "Metrologia e incerteza",
    categoria: "Instrumentação - Conhecimento Técnico",
    niveis: {
      "N1": "Conhece classes de precisão (classe 1.0, 1.6)",
      "N2": "Interpreta certificados de calibração",
      "N3": "Calcula incerteza de medição",
      "N4": "Audia laboratorios; estabelece políticas"
    }
  },
  {
    nome: "Válvulas de controle",
    categoria: "Instrumentação - Conhecimento Técnico",
    niveis: {
      "N1": "Identifica tipos (esfera, globo, borboleta)",
      "N2": "Reconhece anomalias (travamento, vazamento)",
      "N3": "Especifica válvulas para aplicação",
      "N4": "Dimensiona válvulas; define critérios de seleção"
    }
  },
  {
    nome: "Malhas de controle",
    categoria: "Instrumentação - Conhecimento Técnico",
    descricao: "Controle proporcional, integral, derivativo (PID)",
    niveis: {
      "N1": "Conhece conceitos de feedback e setpoint",
      "N2": "Entende comportamento P, I, D isolados",
      "N3": "Afina sintonia (Ziegler-Nichols)",
      "N4": "Define estratégias de controle; otimiza desempenho"
    }
  },
  {
    nome: "Segurança funcional (SIS/SIL)",
    categoria: "Instrumentação - Conhecimento Técnico",
    descricao: "Sistemas instrumentados de segurança, nível de integridade",
    niveis: {
      "N1": "Conhece conceitos básicos (sensor, lógica, atuador)",
      "N2": "Entende SIL 1-3; testa funções",
      "N3": "Analisa falhas; valida ciclos de testes",
      "N4": "Dimensiona SIS; estabelece procedimentos"
    }
  },
  {
    nome: "Áreas classificadas",
    categoria: "Instrumentação - Conhecimento Técnico",
    descricao: "Classificação de atmosferas explosivas (Ex, ATEX, IEC 61241)",
    niveis: {
      "N1": "Conhece grupos e categorias (Zona 0, 1, 2)",
      "N2": "Identifica equipamentos apropriados",
      "N3": "Interpreta marcas ATEX; valida conformidade",
      "N4": "Classifica áreas; especifica equipamentos"
    }
  },
  {
    nome: "Documentação técnica (ISA, P&ID)",
    categoria: "Instrumentação - Conhecimento Técnico",
    descricao: "Simbologia de instrumentação e diagramas de processo",
    niveis: {
      "N1": "Identifica símbolos básicos em P&ID",
      "N2": "Localiza malhas; rastreia sinal",
      "N3": "Interpreta diagramas complexos; valida implementação",
      "N4": "Cria diagramas; estabelece padrões"
    }
  }
]

const INSTRUMENTACAO_MANUTENCAO: Competencia[] = [
  {
    nome: "Calibração de instrumentos",
    categoria: "Instrumentação - Manutenção e Reparo",
    niveis: {
      "N1": "Auxilia calibração; registra dados",
      "N2": "Realiza calibração simples com procedimento",
      "N3": "Executa calibração completa; traça certificado",
      "N4": "Define procedimentos de calibração; qualifica laboratórios"
    }
  },
  {
    nome: "Manutenção preventiva de instrumentos",
    categoria: "Instrumentação - Manutenção e Reparo",
    niveis: {
      "N1": "Executa limpeza e inspeção visual",
      "N2": "Realiza troca de peças conforme procedimento",
      "N3": "Diagnostica falhas simples",
      "N4": "Define plano de manutenção preventiva"
    }
  },
  {
    nome: "Manutenção preditiva (análise de dados)",
    categoria: "Instrumentação - Manutenção e Reparo",
    niveis: {
      "N1": "Coleta dados de sensor; reconhece anomalia",
      "N2": "Interpreta tendências; correlaciona com falha",
      "N3": "Estabelece limites de alerta; acompanha histórico",
      "N4": "Implementa estratégia preditiva; define modelos"
    }
  },
  {
    nome: "Válvulas e posicionadores",
    categoria: "Instrumentação - Manutenção e Reparo",
    niveis: {
      "N1": "Identifica falhas (vazamento, travamento)",
      "N2": "Executa manutenção conforme procedimento",
      "N3": "Testa resposta de posicionador; diagnostica falha",
      "N4": "Especifica válvulas; define critérios de aceitação"
    }
  },
  {
    nome: "Analisadores de processo",
    categoria: "Instrumentação - Manutenção e Reparo",
    niveis: {
      "N1": "Realiza limpeza de sonda; troca de reagente",
      "N2": "Executa calibração simples; testa sinal",
      "N3": "Diagnostica falhas; realiza ajustes",
      "N4": "Especifica analisadores; define estratégia"
    }
  },
  {
    nome: "Comissionamento de sistemas instrumentados",
    categoria: "Instrumentação - Manutenção e Reparo",
    niveis: {
      "N1": "Auxilia testes conforme checklist",
      "N2": "Executa testes de sensor e atuador",
      "N3": "Valida malhas de controle",
      "N4": "Coordena comissionamento completo"
    }
  }
]

const INSTRUMENTACAO_COMUNICACAO: Competencia[] = [
  {
    nome: "Sinal analógico 4-20 mA",
    categoria: "Instrumentação - Comunicação e Redes",
    niveis: {
      "N1": "Conhece faixa padrão; mede com multímetro",
      "N2": "Interpreta faixa zero morto; valida sinal",
      "N3": "Diagnostica problemas de loop (resistência)",
      "N4": "Define padrão 4-20 mA; especifica cabos"
    }
  },
  {
    nome: "HART (Highway Addressable Remote Transducer)",
    categoria: "Instrumentação - Comunicação e Redes",
    niveis: {
      "N1": "Conhece protocolo; identifica dispositivos HART",
      "N2": "Comunica com HART modem; lê parâmetros",
      "N3": "Configura alertas; diagnostica falhas",
      "N4": "Especifica dispositivos; define estratégia HART"
    }
  },
  {
    nome: "Profibus DP/PA",
    categoria: "Instrumentação - Comunicação e Redes",
    niveis: {
      "N1": "Conhece conceitos; identifica nós",
      "N2": "Executa diagnóstico com ferramenta",
      "N3": "Interpreta mensagens; diagnostica problemas",
      "N4": "Configura rede; especifica equipamentos"
    }
  },
  {
    nome: "Fieldbus FF (FOUNDATION Fieldbus)",
    categoria: "Instrumentação - Comunicação e Redes",
    niveis: {
      "N1": "Conhece conceitos; identifica dispositivos FF",
      "N2": "Executa diagnóstico com ferramenta",
      "N3": "Interpreta DFD (Device Function Diagram)",
      "N4": "Configura rede FF; especifica equipamentos"
    }
  },
  {
    nome: "Modbus TCP/RTU",
    categoria: "Instrumentação - Comunicação e Redes",
    niveis: {
      "N1": "Conhece protocolo; identifica nós",
      "N2": "Executa comunicação com software",
      "N3": "Interpreta registros; diagnostica falhas",
      "N4": "Configura rede Modbus; define padrão"
    }
  },
  {
    nome: "OPC (OLE for Process Control)",
    categoria: "Instrumentação - Comunicação e Redes",
    niveis: {
      "N1": "Conhece conceito de servidor OPC",
      "N2": "Conecta cliente OPC; lê valores",
      "N3": "Configura tags; diagnostica falhas de conexão",
      "N4": "Implementa servidor OPC; especifica arquitetura"
    }
  },
  {
    nome: "Asset Management (transmissores inteligentes)",
    categoria: "Instrumentação - Comunicação e Redes",
    niveis: {
      "N1": "Conhece firmware; lê versão com software",
      "N2": "Executa atualização de firmware",
      "N3": "Interpreta logs; diagnostica falha de dispositivo",
      "N4": "Define estratégia de Asset Management"
    }
  },
  {
    nome: "Cibersegurança em redes de instrumentação",
    categoria: "Instrumentação - Comunicação e Redes",
    niveis: {
      "N1": "Conhece riscos básicos; segue política de senha",
      "N2": "Identifica acessos não autorizados",
      "N3": "Implementa segmentação de rede",
      "N4": "Define política de cibersegurança OT"
    }
  }
]

const INSTRUMENTACAO_PROGRAMACAO: Competencia[] = [
  {
    nome: "Parametrização de transmissores",
    categoria: "Instrumentação - Programação e Configuração",
    niveis: {
      "N1": "Conhece parâmetros principais",
      "N2": "Altera span e zero com procedimento",
      "N3": "Configura linearização e temperatura",
      "N4": "Define estratégia de parametrização"
    }
  },
  {
    nome: "Configuração de posicionadores",
    categoria: "Instrumentação - Programação e Configuração",
    niveis: {
      "N1": "Conhece controles de pressão e feedback",
      "N2": "Executa calibração conforme manual",
      "N3": "Ajusta resposta dinâmica",
      "N4": "Especifica posicionadores para aplicação"
    }
  },
  {
    nome: "Programação de medidores e contadores",
    categoria: "Instrumentação - Programação e Configuração",
    niveis: {
      "N1": "Conhece parâmetros básicos",
      "N2": "Altera unidades e fatores de escala",
      "N3": "Configura totalizadores e alarmes",
      "N4": "Define estratégia de medição"
    }
  },
  {
    nome: "Rastreabilidade e auditoria de mudanças",
    categoria: "Instrumentação - Programação e Configuração",
    niveis: {
      "N1": "Registra mudanças em planilha",
      "N2": "Documenta antes/depois de alterações",
      "N3": "Mantém histórico; valida conformidade",
      "N4": "Implementa sistema de rastreabilidade"
    }
  }
]

const INSTRUMENTACAO_SEGURANCA: Competencia[] = [
  {
    nome: "NR-10 (Segurança em eletricidade)",
    categoria: "Instrumentação - Segurança e Normas",
    niveis: {
      "N1": "Conhece conceitos; é autorizado a trabalhar",
      "N2": "Executa tarefas conforme procedimento; usa EPI",
      "N3": "Supervisiona trabalho; valida conformidade",
      "N4": "Define procedimentos; treina equipe"
    }
  },
  {
    nome: "NR-12 (Segurança em máquinas)",
    categoria: "Instrumentação - Segurança e Normas",
    niveis: {
      "N1": "Conhece conceitos de segurança de máquinas",
      "N2": "Executa manutenção respeitando proteções",
      "N3": "Valida proteções; sugere melhorias",
      "N4": "Implementa medidas; inspeciona conformidade"
    }
  },
  {
    nome: "NR-13 (Caldeiras e vasos de pressão)",
    categoria: "Instrumentação - Segurança e Normas",
    niveis: {
      "N1": "Conhece requisitos básicos",
      "N2": "Executa testes conforme procedimento",
      "N3": "Interpreta resultados; coordena inspeções",
      "N4": "Define estratégia de inspeção"
    }
  },
  {
    nome: "LOTO (Lockout/Tagout)",
    categoria: "Instrumentação - Segurança e Normas",
    niveis: {
      "N1": "Conhece princípios; segue procedimento",
      "N2": "Executa bloqueio conforme checklist",
      "N3": "Valida bloqueio; orienta equipe",
      "N4": "Define procedimentos; audita conformidade"
    }
  },
  {
    nome: "MOC (Management of Change)",
    categoria: "Instrumentação - Segurança e Normas",
    descricao: "Gestão de mudanças em sistemas instrumentados",
    niveis: {
      "N1": "Solicita MOC para mudanças",
      "N2": "Documenta mudança proposta",
      "N3": "Avalia impacto de mudança",
      "N4": "Aprova e implementa MOC"
    }
  }
]

// ============================================
// ELÉTRICA NA MANUTENÇÃO INDUSTRIAL
// ============================================

const ELETRICA_CONHECIMENTO: Competencia[] = [
  {
    nome: "Baixa Tensão (BT - até 1kV)",
    categoria: "Elétrica - Conhecimento Técnico",
    niveis: {
      "N1": "Conhece componentes básicos (disjuntor, contator, fusível)",
      "N2": "Interpreta esquemas simples; mede tensão",
      "N3": "Analisa circuitos; diagnostica falhas",
      "N4": "Projeta sistemas BT; especifica componentes"
    }
  },
  {
    nome: "Média Tensão (MT - 1 a 35 kV)",
    categoria: "Elétrica - Conhecimento Técnico",
    niveis: {
      "N1": "Conhece riscos; segue procedimento",
      "N2": "Executa tarefas simples com supervisão",
      "N3": "Diagnostica falhas em subestação",
      "N4": "Gerencia subestação MT"
    }
  },
  {
    nome: "Alta Tensão (AT - acima de 35 kV)",
    categoria: "Elétrica - Conhecimento Técnico",
    niveis: {
      "N1": "Conhece riscos; não trabalha sem autorização",
      "N2": "Executa tarefas simples conforme procedimento",
      "N3": "Realiza testes em AT",
      "N4": "Gerencia sistemas AT"
    }
  },
  {
    nome: "Motores elétricos (monofásico e trifásico)",
    categoria: "Elétrica - Conhecimento Técnico",
    niveis: {
      "N1": "Identifica tipo e especificação (potência, velocidade)",
      "N2": "Reconhece falhas (aquecimento, vibração, ruído)",
      "N3": "Executa manutenção; testa isolação",
      "N4": "Especifica motores; define critérios de aceitação"
    }
  },
  {
    nome: "Acionamentos elétricos (VFD, soft-starter)",
    categoria: "Elétrica - Conhecimento Técnico",
    niveis: {
      "N1": "Identifica tipo; conhece funções básicas",
      "N2": "Interpreta display; reconhece falhas comuns",
      "N3": "Parametriza; diagnostica falhas",
      "N4": "Especifica acionamentos; define estratégia"
    }
  },
  {
    nome: "Painéis e quadros elétricos",
    categoria: "Elétrica - Conhecimento Técnico",
    niveis: {
      "N1": "Identifica componentes; conhece risco",
      "N2": "Executa tarefas conforme procedimento",
      "N3": "Diagnóstico de falha em painel",
      "N4": "Projeta painéis; especifica componentes"
    }
  },
  {
    nome: "Cabos e conexões",
    categoria: "Elétrica - Conhecimento Técnico",
    niveis: {
      "N1": "Identifica seção de cabo; conhece isolação",
      "N2": "Executa trocas com procedimento",
      "N3": "Dimensiona cabos; testa continuidade",
      "N4": "Define padrão de cabeamento; especifica cabos"
    }
  },
  {
    nome: "Aterramento e SPDA (Sistema de Proteção contra Descargas Atmosféricas)",
    categoria: "Elétrica - Conhecimento Técnico",
    niveis: {
      "N1": "Conhece conceitos básicos",
      "N2": "Mede resistência de aterramento",
      "N3": "Interpreta medições; identifica degradação",
      "N4": "Projeta sistema de aterramento e SPDA"
    }
  },
  {
    nome: "Qualidade de energia",
    categoria: "Elétrica - Conhecimento Técnico",
    descricao: "Harmônicos, fator de potência, flutuação de tensão",
    niveis: {
      "N1": "Conhece conceitos básicos de fator de potência",
      "N2": "Mede tensão e corrente; reconhece anomalia",
      "N3": "Interpreta análise de qualidade; diagnóstico",
      "N4": "Implementa melhorias de qualidade"
    }
  },
  {
    nome: "Proteções e seletividade",
    categoria: "Elétrica - Conhecimento Técnico",
    niveis: {
      "N1": "Conhece tipos de proteção (sobrecarga, curto-circuito)",
      "N2": "Reconhece atuação; repõe disjuntor",
      "N3": "Executa coordenação de proteção",
      "N4": "Especifica curva de proteção; coordena seletividade"
    }
  }
]

const ELETRICA_MANUTENCAO: Competencia[] = [
  {
    nome: "Manutenção de motores",
    categoria: "Elétrica - Manutenção e Reparo",
    niveis: {
      "N1": "Executa limpeza; testa isolação básica",
      "N2": "Realiza troca de rolamentos; testa com Megohmímetro",
      "N3": "Diagnostica falha elétrica; determina causa raiz",
      "N4": "Especifica motores; define vida residual"
    }
  },
  {
    nome: "Manutenção de acionamentos (VFD, soft-starter)",
    categoria: "Elétrica - Manutenção e Reparo",
    niveis: {
      "N1": "Executa limpeza; testa sinal",
      "N2": "Realiza substituição conforme procedimento",
      "N3": "Diagnostica falha de acionamento",
      "N4": "Parametriza acionamento; especifica marca"
    }
  },
  {
    nome: "Manutenção de painéis elétricos",
    categoria: "Elétrica - Manutenção e Reparo",
    niveis: {
      "N1": "Executa limpeza; testa componente",
      "N2": "Realiza troca de contator, relé com procedimento",
      "N3": "Diagnostica falha em painel",
      "N4": "Especifica componentes; padroniza painéis"
    }
  },
  {
    nome: "Cabeamento e conexões",
    categoria: "Elétrica - Manutenção e Reparo",
    niveis: {
      "N1": "Executa inspeção visual; testa continuidade",
      "N2": "Realiza crimagem e soldagem conforme procedimento",
      "N3": "Diagnostica problema de conexão",
      "N4": "Padroniza cabeamento; especifica padrão"
    }
  },
  {
    nome: "Testes elétricos e diagnósticos",
    categoria: "Elétrica - Manutenção e Reparo",
    niveis: {
      "N1": "Mede tensão e corrente com multímetro",
      "N2": "Realiza testes com avômetro, Megohmímetro",
      "N3": "Executa análise de isolação; testes de sequência",
      "N4": "Coordena testes especializados; interpreta resultados"
    }
  }
]

const ELETRICA_MANOBRAS: Competencia[] = [
  {
    nome: "Manobras e operação de subestação",
    categoria: "Elétrica - Manobras e Operação",
    niveis: {
      "N1": "Conhece procedimento; executa com supervisão",
      "N2": "Executa manobra simples conforme procedimento",
      "N3": "Coordena manobras complexas",
      "N4": "Define procedimento; supervisiona operação"
    }
  },
  {
    nome: "Partida de motores",
    categoria: "Elétrica - Manobras e Operação",
    niveis: {
      "N1": "Executa partida conforme procedimento",
      "N2": "Reconhece anomalias; atua conforme procedimento",
      "N3": "Diagnostica falha de partida",
      "N4": "Define sequência de partida; otimiza operação"
    }
  }
]

// ============================================
// CALDEIRARIA E SOLDA
// ============================================

const CALDEIRARIA_SOLDA: Competencia[] = [
  {
    nome: "Leitura de desenhos técnicos",
    categoria: "Caldeiraria e Solda - Habilidades",
    niveis: {
      "N1": "Lê perspectiva e vistas; identifica cotas",
      "N2": "Interpreta tolerâncias e simbologia de solda",
      "N3": "Analisa complexidade de estrutura",
      "N4": "Valida fabricação conforme desenho"
    }
  },
  {
    nome: "Materiais metálicos (aços, alumínio, inox)",
    categoria: "Caldeiraria e Solda - Conhecimento Técnico",
    niveis: {
      "N1": "Identifica tipo de material; conhece propriedades básicas",
      "N2": "Relaciona material a aplicação; seleciona consumível",
      "N3": "Interpreta tratamento térmico; especifica liga",
      "N4": "Define material para aplicação crítica"
    }
  },
  {
    nome: "Processos de soldagem (MIG/MAG, TIG, eletrodo)",
    categoria: "Caldeiraria e Solda - Habilidades",
    niveis: {
      "N1": "Conhece conceitos; executa com supervisão",
      "N2": "Solda conforme procedimento; produz junta aceitável",
      "N3": "Executa solda em posições variadas; diagnostica defeito",
      "N4": "Qualifica procedimento de solda (WPS)"
    }
  },
  {
    nome: "Corte (plasma, oxicorte, serra)",
    categoria: "Caldeiraria e Solda - Habilidades",
    niveis: {
      "N1": "Conhece equipamento; executa com supervisão",
      "N2": "Executa corte conforme procedimento",
      "N3": "Diagnostica qualidade de corte",
      "N4": "Define padrão de corte"
    }
  },
  {
    nome: "Conformação (dobragem, estampagem)",
    categoria: "Caldeiraria e Solda - Habilidades",
    niveis: {
      "N1": "Conhece equipamento; executa com supervisão",
      "N2": "Executa conformação conforme desenho",
      "N3": "Diagnostica qualidade; ajusta parâmetros",
      "N4": "Especifica equipamento; define padrão"
    }
  },
  {
    nome: "Montagem de estruturas",
    categoria: "Caldeiraria e Solda - Habilidades",
    niveis: {
      "N1": "Posiciona conforme desenho; fixa temporariamente",
      "N2": "Realiza pré-alinhamento; prepara para solda",
      "N3": "Alinha estrutura conforme tolerância; coordena solda",
      "N4": "Gerencia montagem; valida conformidade"
    }
  },
  {
    nome: "Tratamentos térmicos (normalização, têmpera, revenido)",
    categoria: "Caldeiraria e Solda - Conhecimento Técnico",
    niveis: {
      "N1": "Conhece tipos e temperaturas básicas",
      "N2": "Supervisiona tratamento; registra tempo/temperatura",
      "N3": "Interpreta dureza; ajusta parâmetro",
      "N4": "Especifica tratamento térmico; valida dureza"
    }
  },
  {
    nome: "Metrologia e inspeção",
    categoria: "Caldeiraria e Solda - Habilidades",
    niveis: {
      "N1": "Mede com paquímetro; compara com desenho",
      "N2": "Mede ângulos e raios; valida tolerância",
      "N3": "Usa calibre; interpreta especificação",
      "N4": "Define tolerância; supervisiona inspeção"
    }
  },
  {
    nome: "Ensaios não destrutivos (VT, UT, RT, MT)",
    categoria: "Caldeiraria e Solda - Habilidades",
    niveis: {
      "N1": "Observa ensaio; aprende técnica",
      "N2": "Prepara amostra; auxilia inspetor",
      "N3": "Interpreta resultado; correlaciona com defeito",
      "N4": "Qualifica procedimento; audita inspetor"
    }
  },
  {
    nome: "Normas (ASME, AWS, ABNT)",
    categoria: "Caldeiraria e Solda - Segurança e Normas",
    niveis: {
      "N1": "Conhece requisito básico (espessura, diâmetro)",
      "N2": "Segue procedimento conforme norma",
      "N3": "Valida conformidade com norma",
      "N4": "Implementa norma; audita conformidade"
    }
  }
]

// ============================================
// AUTOMAÇÃO INDUSTRIAL
// ============================================

const AUTOMACAO_CONHECIMENTO: Competencia[] = [
  {
    nome: "PLC (Programmable Logic Controller)",
    categoria: "Automação - Conhecimento Técnico",
    niveis: {
      "N1": "Identifica componentes; conhece entradas/saídas",
      "N2": "Entende lógica ladder; modifica parâmetro",
      "N3": "Programa funcionalidade simples; diagnostica",
      "N4": "Projeta sistema PLC; especifica marca"
    }
  },
  {
    nome: "DCS (Distributed Control System)",
    categoria: "Automação - Conhecimento Técnico",
    niveis: {
      "N1": "Identifica componentes; conhece hierarquia",
      "N2": "Navega telas; reconhece alarmes",
      "N3": "Modifica configuração simples",
      "N4": "Gerencia DCS; especifica hardware"
    }
  },
  {
    nome: "SCADA/IHM (Supervisory Control and Data Acquisition / Interface Homem-Máquina)",
    categoria: "Automação - Conhecimento Técnico",
    niveis: {
      "N1": "Navega telas; reconhece estado",
      "N2": "Executa comando; valida feedback",
      "N3": "Modifica tela; diagnóstico de falha",
      "N4": "Desenvolve SCADA; especifica funcionalidade"
    }
  },
  {
    nome: "Instrumentação e controle",
    categoria: "Automação - Conhecimento Técnico",
    niveis: {
      "N1": "Conhece sensores e atuadores",
      "N2": "Executa testes; valida sinal",
      "N3": "Diagnostica malha; afina PID",
      "N4": "Especifica malha; define estratégia"
    }
  },
  {
    nome: "Redes industriais (Ethernet Industrial, Profibus, Modbus)",
    categoria: "Automação - Conhecimento Técnico",
    niveis: {
      "N1": "Conhece protocolo; identifica nó",
      "N2": "Executa diagnóstico com ferramenta",
      "N3": "Configura rede simples",
      "N4": "Projeta arquitetura de rede"
    }
  },
  {
    nome: "Programação IEC 61131-3",
    categoria: "Automação - Conhecimento Técnico",
    descricao: "Linguagens: Ladder, Structured Text, Function Block Diagram",
    niveis: {
      "N1": "Conhece linguagem; lê código simples",
      "N2": "Modifica variável; testa mudança",
      "N3": "Programa lógica simples em ST ou FBD",
      "N4": "Desenvolve aplicação complexa; otimiza código"
    }
  },
  {
    nome: "Cibersegurança em Tecnologia Operacional (OT)",
    categoria: "Automação - Conhecimento Técnico",
    niveis: {
      "N1": "Conhece riscos; segue política de senha",
      "N2": "Identifica acesso não autorizado",
      "N3": "Implementa segmentação de rede",
      "N4": "Define política de cibersegurança OT"
    }
  },
  {
    nome: "Análise de dados e Business Intelligence (BI)",
    categoria: "Automação - Conhecimento Técnico",
    niveis: {
      "N1": "Coleta dados; registra em planilha",
      "N2": "Interpreta relatório simples",
      "N3": "Cria dashboard; analisa tendência",
      "N4": "Implementa sistema BI; define KPIs"
    }
  }
]

const AUTOMACAO_MANUTENCAO: Competencia[] = [
  {
    nome: "Manutenção preventiva de PLC/DCS",
    categoria: "Automação - Manutenção e Reparo",
    niveis: {
      "N1": "Executa limpeza; verifica fonte",
      "N2": "Realiza backup de programa",
      "N3": "Diagnóstico de falha; substitui módulo",
      "N4": "Define plano de manutenção"
    }
  },
  {
    nome: "Diagnóstico de problemas de automação",
    categoria: "Automação - Manutenção e Reparo",
    niveis: {
      "N1": "Relata sintoma; segue checklist",
      "N2": "Valida sinal de sensor; testa atuador",
      "N3": "Diagnostica PLC/DCS; analisa log",
      "N4": "Investiga causa raiz; implementa solução"
    }
  },
  {
    nome: "Testes de funcionamento e comissionamento",
    categoria: "Automação - Manutenção e Reparo",
    niveis: {
      "N1": "Auxilia testes; registra resultado",
      "N2": "Executa teste conforme checklist",
      "N3": "Diagnostica falha em teste",
      "N4": "Coordena comissionamento completo"
    }
  }
]

const AUTOMACAO_LIDERANCA: Competencia[] = [
  {
    nome: "Liderança e comunicação técnica",
    categoria: "Automação - Liderança e Desenvolvimento",
    descricao: "Capacidade de coordenar equipe e comunicar tecnicamente",
    niveis: {
      "N1": "Comunica de forma clara; documenta atividade",
      "N2": "Coordena pequeno grupo; treina colega",
      "N3": "Lidera projeto; orienta técnicos",
      "N4": "Gerencia departamento; desenvolve equipe"
    }
  },
  {
    nome: "Manutenção de conhecimento (documentação técnica)",
    categoria: "Automação - Liderança e Desenvolvimento",
    niveis: {
      "N1": "Documenta seu trabalho",
      "N2": "Mantém manual atualizado; cria procedimento",
      "N3": "Gera relatório de diagnóstico completo",
      "N4": "Implementa sistema de gestão de conhecimento"
    }
  }
]

// ============================================
// INTEGRAÇÃO FINAL
// ============================================

export const COMPETENCIAS_DISPONIVEIS: CompetenciasPorCategoria = {
  // Mecânica
  ...Object.fromEntries(
    [...MECANICA_CONHECIMENTO_TECNICO, ...MECANICA_MANUTENCAO, ...MECANICA_LUBRIFICACAO, ...MECANICA_ALINHAMENTO, ...MECANICA_SEGURANCA]
      .map(c => [c.nome, [c]])
  ),
  // Instrumentação
  ...Object.fromEntries(
    [...INSTRUMENTACAO_CONHECIMENTO, ...INSTRUMENTACAO_MANUTENCAO, ...INSTRUMENTACAO_COMUNICACAO, ...INSTRUMENTACAO_PROGRAMACAO, ...INSTRUMENTACAO_SEGURANCA]
      .map(c => [c.nome, [c]])
  ),
  // Elétrica
  ...Object.fromEntries(
    [...ELETRICA_CONHECIMENTO, ...ELETRICA_MANUTENCAO, ...ELETRICA_MANOBRAS]
      .map(c => [c.nome, [c]])
  ),
  // Caldeiraria
  ...Object.fromEntries(
    CALDEIRARIA_SOLDA.map(c => [c.nome, [c]])
  ),
  // Automação
  ...Object.fromEntries(
    [...AUTOMACAO_CONHECIMENTO, ...AUTOMACAO_MANUTENCAO, ...AUTOMACAO_LIDERANCA]
      .map(c => [c.nome, [c]])
  ),
}
