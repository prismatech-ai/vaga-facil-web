/**
 * MAPA DE COMPETÊNCIAS - VAGAFÁCIL
 * Baseado em documentos de autoavaliação por área
 * Estrutura conforme PDFs: AUTOMAÇÃO e CALDEIRARIA E SOLDA
 * 
 * Escalas de Proficiência:
 * N1 - Básico: Conhece conceitos fundamentais, executa com supervisão
 * N2 - Intermediário: Executa autônomo em cenários padrão, documenta adequadamente
 * N3 - Avançado: Opera em cenários complexos, padroniza, treina outros, previne recorrências
 * N4 - Expert: Referência técnica, define padrões, integra soluções, lidera melhorias
 */

export interface Competencia {
  id: string
  nome: string
  descricao?: string
  indicadores?: {
    n1?: string
    n2?: string
    n3?: string
    n4?: string
  }
  nivel: 1 | 2 | 3 | null
}

export interface CategoriaCompetencias {
  id: string
  nome: string
  descricao?: string
  competencias: Competencia[]
}

export interface Area {
  id: string
  nome: string
  descricao: string
  categorias: CategoriaCompetencias[]
}

// ESCALA DE PROFICIÊNCIA (Padrão para todas as áreas)
export const NIVEL_LABELS = {
  1: "N1 - Básico",
  2: "N2 - Intermediário",
  3: "N3 - Avançado",
  4: "N4 - Expert",
} as const

export const NIVEL_DESCRICOES = {
  1: "Conhece conceitos fundamentais, executa com supervisão",
  2: "Executa autônomo em cenários padrão, documenta adequadamente",
  3: "Opera em cenários complexos, padroniza, treina outros, previne recorrências",
  4: "Referência técnica, define padrões, integra soluções, lidera melhorias",
} as const

// ============================================================================
// ÁREA 1: AUTOMAÇÃO INDUSTRIAL
// ============================================================================
export const AREA_AUTOMACAO: Area = {
  id: "automacao",
  nome: "Automação Industrial",
  descricao:
    "Especialista em CLP/PLC, DCS, SCADA, IHM, Redes Industriais e Segurança Funcional",
  categorias: [
    {
      id: "conhecimento_tecnico",
      nome: "Conhecimento Técnico em Automação",
      competencias: [
        { id: "clp", nome: "Controladores Lógicos Programáveis (CLP/PLC)", nivel: null },
        {
          id: "clp_plataformas",
          nome: "Plataformas CLP (Siemens, Rockwell, Schneider, ABB, Omron)",
          nivel: null,
        },
        { id: "dcs", nome: "Sistemas de Controle Distribuído (DCS)", nivel: null },
        { id: "scada", nome: "SCADA, IHM e Historians", nivel: null },
        {
          id: "instrumentacao",
          nome: "Instrumentação e Laços de Controle (4-20mA, HART, Fieldbus)",
          nivel: null,
        },
        {
          id: "acionamentos",
          nome: "Acionamentos, Drives e Motion Control",
          nivel: null,
        },
        {
          id: "eletronica_automacao",
          nome: "Eletrônica Aplicada à Automação",
          nivel: null,
        },
      ],
    },
    {
      id: "programacao_configuracao",
      nome: "Programação e Configuração",
      competencias: [
        {
          id: "iec_61131",
          nome: "Linguagens IEC 61131-3 (Ladder, ST, FBD, SFC)",
          nivel: null,
        },
        {
          id: "versionamento",
          nome: "Versionamento e Boas Práticas de Engenharia (Git/SVN)",
          nivel: null,
        },
        {
          id: "configuracao_ihm_scada",
          nome: "Configuração de IHM/SCADA (Telas, Alarmes, Scripts)",
          nivel: null,
        },
        {
          id: "integracao_sistemas",
          nome: "Integração de Sistemas (OPC UA, MQTT, MES, APM)",
          nivel: null,
        },
      ],
    },
    {
      id: "redes_industriais",
      nome: "Protocolos e Redes de Comunicação Industrial",
      competencias: [
        {
          id: "protocolos_industriais",
          nome: "Protocolos Industriais (Modbus, Profibus, PROFINET, EtherNet/IP, HART, FF)",
          nivel: null,
        },
        {
          id: "diagnostico_redes",
          nome: "Diagnóstico de Redes Industriais",
          nivel: null,
        },
        {
          id: "seguranca_ot",
          nome: "Segurança de Redes Industriais (ISA/IEC 62443)",
          nivel: null,
        },
      ],
    },
    {
      id: "manutencao_reparo",
      nome: "Manutenção e Reparo",
      competencias: [
        {
          id: "estrategias_manutencao",
          nome: "Estratégias de Manutenção (PM, PdM, CBM, RCM)",
          nivel: null,
        },
        {
          id: "calibracao_metrologia",
          nome: "Calibração e Metrologia",
          nivel: null,
        },
        {
          id: "comissionamento",
          nome: "Comissionamento e Start-up (FAT/SAT)",
          nivel: null,
        },
        {
          id: "sobressalentes_obsolescencia",
          nome: "Gestão de Sobressalentes e Obsolescência",
          nivel: null,
        },
        {
          id: "documentacao_engenharia",
          nome: "Documentação e Engenharia de Manutenção (P&ID, As-Built)",
          nivel: null,
        },
      ],
    },
    {
      id: "diagnostico_solucao",
      nome: "Diagnóstico e Solução de Problemas",
      competencias: [
        {
          id: "rca_fmea",
          nome: "Metodologias de Diagnóstico (RCA, 5 Porquês, Ishikawa, FMEA)",
          nivel: null,
        },
        {
          id: "ferramentas_diagnostico",
          nome: "Ferramentas de Diagnóstico (Multímetro, Loop Calibrator, Osciloscópio)",
          nivel: null,
        },
        {
          id: "analise_dados_predicao",
          nome: "Análise de Dados e Predição (Tendências, Detecção de Anomalias)",
          nivel: null,
        },
      ],
    },
    {
      id: "normas_seguranca",
      nome: "Normas e Regulamentações",
      competencias: [
        {
          id: "normas_eletricas",
          nome: "Normas Elétricas (NR-10, NR-12, IEC 60204-1)",
          nivel: null,
        },
        {
          id: "seguranca_funcional",
          nome: "Segurança Funcional (IEC 61508/61511, SIL, PL)",
          nivel: null,
        },
        {
          id: "iso_standards",
          nome: "Padrões ISO (55000 - Gestão de Ativos, 14224 - Confiabilidade)",
          nivel: null,
        },
      ],
    },
    {
      id: "trabalho_equipe",
      nome: "Trabalho em Equipe e Comunicação",
      competencias: [
        {
          id: "comunicacao_tecnica",
          nome: "Comunicação Técnica e Documentação",
          nivel: null,
        },
        {
          id: "colaboracao_interfuncional",
          nome: "Colaboração Interfuncional (Operação, Engenharia, TI/OT)",
          nivel: null,
        },
        {
          id: "planejamento_risco",
          nome: "Planejamento e Priorização Baseada em Risco",
          nivel: null,
        },
        {
          id: "lideranca",
          nome: "Liderança e Desenvolvimento de Equipe",
          nivel: null,
        },
      ],
    },
    {
      id: "transversais_automacao",
      nome: "Competências Transversais",
      competencias: [
        { id: "cmms_eam", nome: "CMMS/EAM (SAP PM, IBM Maximo)", nivel: null },
        {
          id: "leitura_diagramas",
          nome: "Leitura de P&ID, Diagramas Elétricos e ISA-95",
          nivel: null,
        },
        { id: "ingles_tecnico", nome: "Inglês Técnico", nivel: null },
        {
          id: "ferramentas_engenharia",
          nome: "Ferramentas de Engenharia (EPLAN, AutoCAD, TIA Portal, Studio 5000)",
          nivel: null,
        },
        {
          id: "data_literacy",
          nome: "Data Literacy (SQL, OPC UA, MQTT, Historians)",
          nivel: null,
        },
      ],
    },
  ],
}

// ============================================================================
// ÁREA 2: CALDEIRARIA E SOLDA
// ============================================================================
export const AREA_CALDEIRARIA_SOLDA: Area = {
  id: "caldeiraria_solda",
  nome: "Caldeiraria e Solda",
  descricao:
    "Especialista em processos de solda, caldeiraria e fabricação de estruturas metálicas",
  categorias: [
    {
      id: "processos_solda",
      nome: "Processos de Solda",
      competencias: [
        { id: "arco_eletrico", nome: "Solda a Arco Elétrico (SMAW/MMA)", nivel: null },
        {
          id: "gas_inerte",
          nome: "Soldagem com Gás Inerte (GMAW/MIG e GTAW/TIG)",
          nivel: null,
        },
        { id: "arco_submerso", nome: "Soldagem a Arco Submerso (SAW)", nivel: null },
        { id: "plasma", nome: "Soldagem a Plasma e Corte com Plasma", nivel: null },
        { id: "laser", nome: "Soldagem a Laser", nivel: null },
        { id: "fricção", nome: "Soldagem por Fricção", nivel: null },
      ],
    },
    {
      id: "inspeção_qualidade",
      nome: "Inspeção e Qualidade de Solda",
      competencias: [
        {
          id: "visual_inspeção",
          nome: "Inspeção Visual de Soldas",
          nivel: null,
        },
        {
          id: "ensaios_nao_destrutivos",
          nome: "Ensaios Não Destrutivos (Ultrassom, Raio-X, Líquido Penetrante)",
          nivel: null,
        },
        {
          id: "metalografia",
          nome: "Testes de Metalografia e Dureza",
          nivel: null,
        },
        {
          id: "qualidade_metrologia",
          nome: "Qualidade e Metrologia de Soldas",
          nivel: null,
        },
      ],
    },
    {
      id: "projeto_caldeiraria",
      nome: "Projeto e Design em Caldeiraria",
      competencias: [
        {
          id: "desenho_tecnico",
          nome: "Desenho Técnico e Leitura de Projetos",
          nivel: null,
        },
        {
          id: "softwares_cad",
          nome: "Softwares CAD (AutoCAD, SolidWorks, Inventor)",
          nivel: null,
        },
        {
          id: "calculo_estrutural",
          nome: "Cálculo de Estruturas e Resistência de Materiais",
          nivel: null,
        },
        {
          id: "fabricacao_sequencia",
          nome: "Planejamento de Sequência de Fabricação",
          nivel: null,
        },
      ],
    },
    {
      id: "materiais_metalurgicos",
      nome: "Materiais Metalúrgicos",
      competencias: [
        {
          id: "tipos_aco",
          nome: "Tipos de Aço (Carbono, Inoxidável, Liga)",
          nivel: null,
        },
        {
          id: "liga_materiais",
          nome: "Ligas Não Ferrosas e Alumínio",
          nivel: null,
        },
        {
          id: "tratamento_termico",
          nome: "Tratamento Térmico e Normalização",
          nivel: null,
        },
        {
          id: "compatibilidade_materiais",
          nome: "Compatibilidade de Materiais e Soldabilidade",
          nivel: null,
        },
      ],
    },
    {
      id: "normas_procedimentos",
      nome: "Normas e Procedimentos",
      competencias: [
        {
          id: "normas_solda",
          nome: "Normas de Solda (AWS, DIN, ISO, ASME)",
          nivel: null,
        },
        {
          id: "epp_epc",
          nome: "EPI/EPC e Segurança (NR-10, NR-12)",
          nivel: null,
        },
        {
          id: "procedimentos_qualidade",
          nome: "Procedimentos de Qualidade e Rastreabilidade",
          nivel: null,
        },
        {
          id: "certificacoes_profissionais",
          nome: "Certificações Profissionais (ASME, AWS)",
          nivel: null,
        },
      ],
    },
    {
      id: "equipamentos_ferramentas",
      nome: "Equipamentos e Ferramentas",
      competencias: [
        {
          id: "operacao_manuseio",
          nome: "Operação e Manuseio de Equipamentos de Solda",
          nivel: null,
        },
        {
          id: "manutencao_equipamentos",
          nome: "Manutenção Básica de Equipamentos",
          nivel: null,
        },
        {
          id: "ferramentas_apoio",
          nome: "Ferramentas de Apoio e Bancada",
          nivel: null,
        },
      ],
    },
    {
      id: "trabalho_equipe_caldeiraria",
      nome: "Trabalho em Equipe e Comunicação",
      competencias: [
        {
          id: "comunicacao_seguranca",
          nome: "Comunicação de Segurança e Avisos",
          nivel: null,
        },
        {
          id: "trabalho_colaborativo",
          nome: "Trabalho Colaborativo em Oficina",
          nivel: null,
        },
        {
          id: "lideranca_caldeiraria",
          nome: "Liderança e Supervisão",
          nivel: null,
        },
      ],
    },
  ],
}

// ============================================================================
// ÁREA 3: ELÉTRICA
// ============================================================================
export const AREA_ELETRICA: Area = {
  id: "eletrica",
  nome: "Elétrica",
  descricao:
    "Especialista em instalações elétricas, distribuição de energia e controle elétrico",
  categorias: [
    {
      id: "instalacoes_eletricas",
      nome: "Instalações Elétricas",
      competencias: [
        {
          id: "projeto_instalacao",
          nome: "Projeto e Dimensionamento de Instalações",
          nivel: null,
        },
        {
          id: "cabos_condutores",
          nome: "Cabos, Condutores e Canaletas",
          nivel: null,
        },
        {
          id: "quadros_paineis",
          nome: "Quadros e Painéis Elétricos",
          nivel: null,
        },
        {
          id: "aterramento_emc",
          nome: "Aterramento e EMC (Compatibilidade Eletromagnética)",
          nivel: null,
        },
      ],
    },
    {
      id: "distribuicao_energia",
      nome: "Distribuição de Energia",
      competencias: [
        {
          id: "transformadores",
          nome: "Transformadores e Reguladores de Tensão",
          nivel: null,
        },
        {
          id: "subestacoes",
          nome: "Subestações Elétricas",
          nivel: null,
        },
        {
          id: "circuitos_proteção",
          nome: "Circuitos de Proteção e Disjuntores",
          nivel: null,
        },
        {
          id: "distribuicao_tres_fases",
          nome: "Distribuição Trifásica e Monofásica",
          nivel: null,
        },
      ],
    },
    {
      id: "controle_eletrico",
      nome: "Controle Elétrico",
      competencias: [
        {
          id: "relés_contatores",
          nome: "Relés e Contatores",
          nivel: null,
        },
        {
          id: "chaves_comutadores",
          nome: "Chaves e Comutadores",
          nivel: null,
        },
        {
          id: "temporizadores",
          nome: "Temporizadores e Programadores",
          nivel: null,
        },
        {
          id: "motores_eletricos",
          nome: "Motores Elétricos (CC, CA, Síncronos e Assíncronos)",
          nivel: null,
        },
      ],
    },
    {
      id: "medicoes_testes",
      nome: "Medições e Testes Elétricos",
      competencias: [
        {
          id: "multimetro",
          nome: "Multímetro e Instrumentos Básicos",
          nivel: null,
        },
        {
          id: "megometro",
          nome: "Megômetro e Testes de Isolação",
          nivel: null,
        },
        {
          id: "analisador_energia",
          nome: "Analisador de Energia e Harmônicos",
          nivel: null,
        },
        {
          id: "testes_seguranca",
          nome: "Testes de Segurança Elétrica",
          nivel: null,
        },
      ],
    },
    {
      id: "eficiencia_energetica",
      nome: "Eficiência Energética",
      competencias: [
        {
          id: "auditoria_energia",
          nome: "Auditoria Energética",
          nivel: null,
        },
        {
          id: "fator_potencia",
          nome: "Fator de Potência e Correção",
          nivel: null,
        },
        {
          id: "eficiencia_motores",
          nome: "Eficiência de Motores e Variadores",
          nivel: null,
        },
        {
          id: "iluminacao_eficiente",
          nome: "Iluminação Eficiente",
          nivel: null,
        },
      ],
    },
    {
      id: "normas_seguranca_eletrica",
      nome: "Normas e Segurança",
      competencias: [
        {
          id: "nr10",
          nome: "NR-10 (Segurança em Instalações e Serviços com Eletricidade)",
          nivel: null,
        },
        {
          id: "nr12",
          nome: "NR-12 (Proteção de Máquinas)",
          nivel: null,
        },
        {
          id: "iec_60204",
          nome: "IEC 60204-1 (Segurança de Máquinas)",
          nivel: null,
        },
        {
          id: "nbr_eletricas",
          nome: "Normas NBR Elétricas",
          nivel: null,
        },
      ],
    },
  ],
}

// ============================================================================
// ÁREA 4: INSTRUMENTAÇÃO
// ============================================================================
export const AREA_INSTRUMENTACAO: Area = {
  id: "instrumentacao",
  nome: "Instrumentação",
  descricao:
    "Especialista em sensores, transmissores e laços de medição e controle",
  categorias: [
    {
      id: "sensores_transmissores",
      nome: "Sensores e Transmissores",
      competencias: [
        {
          id: "pressao",
          nome: "Transmissores de Pressão",
          nivel: null,
        },
        {
          id: "temperatura",
          nome: "Transmissores de Temperatura",
          nivel: null,
        },
        {
          id: "nivel",
          nome: "Transmissores de Nível",
          nivel: null,
        },
        {
          id: "vazao",
          nome: "Transmissores de Vazão",
          nivel: null,
        },
        {
          id: "outros_sensores",
          nome: "Outros Sensores (Densidade, Condutividade, pH)",
          nivel: null,
        },
      ],
    },
    {
      id: "comunicacao_instrumentacao",
      nome: "Protocolos de Comunicação de Instrumentos",
      competencias: [
        {
          id: "hart_protocol",
          nome: "Protocolo HART",
          nivel: null,
        },
        {
          id: "fieldbus",
          nome: "Foundation Fieldbus",
          nivel: null,
        },
        {
          id: "profibus",
          nome: "Profibus PA",
          nivel: null,
        },
        {
          id: "comunicadores",
          nome: "Comunicadores e Configuradores Inteligentes",
          nivel: null,
        },
      ],
    },
    {
      id: "lacos_controle",
      nome: "Laços de Controle",
      competencias: [
        {
          id: "lacos_4_20ma",
          nome: "Laços 4-20 mA",
          nivel: null,
        },
        {
          id: "controladores_pid",
          nome: "Controladores PID",
          nivel: null,
        },
        {
          id: "valvulas_controle",
          nome: "Válvulas de Controle e Posicionadores",
          nivel: null,
        },
        {
          id: "sintonia_otimizacao",
          nome: "Sintonia e Otimização de Laços",
          nivel: null,
        },
      ],
    },
    {
      id: "calibracao_metrologia_inst",
      nome: "Calibração e Metrologia",
      competencias: [
        {
          id: "calibracao_procedimentos",
          nome: "Procedimentos de Calibração",
          nivel: null,
        },
        {
          id: "padroes_calibracao",
          nome: "Padrões de Calibração",
          nivel: null,
        },
        {
          id: "incerteza_medicao",
          nome: "Incerteza de Medição",
          nivel: null,
        },
        {
          id: "rastreabilidade",
          nome: "Rastreabilidade e Certificados",
          nivel: null,
        },
      ],
    },
    {
      id: "p_id_diagramas",
      nome: "P&ID e Diagramas",
      competencias: [
        {
          id: "leitura_pid",
          nome: "Leitura e Interpretação de P&ID",
          nivel: null,
        },
        {
          id: "simbologia_isa",
          nome: "Simbologia ISA S5.1",
          nivel: null,
        },
        {
          id: "elaboracao_diagramas",
          nome: "Elaboração de Diagramas e Instruções",
          nivel: null,
        },
      ],
    },
    {
      id: "manutencao_instrumentacao",
      nome: "Manutenção de Instrumentação",
      competencias: [
        {
          id: "diagnostico_falhas",
          nome: "Diagnóstico de Falhas em Instrumentos",
          nivel: null,
        },
        {
          id: "limpeza_manutencao",
          nome: "Limpeza e Manutenção de Sensores",
          nivel: null,
        },
        {
          id: "substituicao_manutencao",
          nome: "Substituição e Manutenção de Instrumentos",
          nivel: null,
        },
      ],
    },
  ],
}

// ============================================================================
// ÁREA 5: MECÂNICA
// ============================================================================
export const AREA_MECANICA: Area = {
  id: "mecanica",
  nome: "Mecânica",
  descricao:
    "Especialista em componentes mecânicos, máquinas rotativas e fabricação",
  categorias: [
    {
      id: "maquinas_rotativas",
      nome: "Máquinas Rotativas",
      competencias: [
        {
          id: "bombas",
          nome: "Bombas Centrífugas e de Deslocamento Positivo",
          nivel: null,
        },
        {
          id: "compressores",
          nome: "Compressores e Sopradores",
          nivel: null,
        },
        {
          id: "turbinas",
          nome: "Turbinas e Expansores",
          nivel: null,
        },
        {
          id: "ventiladores",
          nome: "Ventiladores e Circuladores",
          nivel: null,
        },
        {
          id: "motores",
          nome: "Motores e Redutores",
          nivel: null,
        },
      ],
    },
    {
      id: "componentes_mecanicos",
      nome: "Componentes Mecânicos",
      competencias: [
        {
          id: "rolamentos",
          nome: "Rolamentos e Mancais",
          nivel: null,
        },
        {
          id: "engrenagens",
          nome: "Engrenagens e Caixas de Velocidade",
          nivel: null,
        },
        {
          id: "correntes_corridas",
          nome: "Correntes, Correiras e Polias",
          nivel: null,
        },
        {
          id: "acoplamentos",
          nome: "Acoplamentos Flexíveis e Rígidos",
          nivel: null,
        },
        {
          id: "vedacoes",
          nome: "Vedações e Gaxetas",
          nivel: null,
        },
      ],
    },
    {
      id: "analise_vibracao",
      nome: "Análise de Vibração e Confiabilidade",
      competencias: [
        {
          id: "medicao_vibracao",
          nome: "Medição de Vibração",
          nivel: null,
        },
        {
          id: "diagnostico_vibracao",
          nome: "Diagnóstico por Vibração",
          nivel: null,
        },
        {
          id: "balanceamento",
          nome: "Balanceamento de Máquinas Rotativas",
          nivel: null,
        },
        {
          id: "alinhamento",
          nome: "Alinhamento de Máquinas",
          nivel: null,
        },
      ],
    },
    {
      id: "manutencao_mecanica",
      nome: "Manutenção Mecânica",
      competencias: [
        {
          id: "desmontagem_montagem",
          nome: "Desmontagem e Montagem de Conjuntos",
          nivel: null,
        },
        {
          id: "ferramentas_mecanicas",
          nome: "Uso de Ferramentas Mecânicas Avançadas",
          nivel: null,
        },
        {
          id: "procedimentos_lubrificacao",
          nome: "Procedimentos de Lubrificação e Graxa",
          nivel: null,
        },
        {
          id: "procedimentos_limpeza",
          nome: "Procedimentos de Limpeza e Conservação",
          nivel: null,
        },
      ],
    },
    {
      id: "metrologia_mecanica",
      nome: "Metrologia Mecânica",
      competencias: [
        {
          id: "paquimetro_micrometro",
          nome: "Paquímetro e Micrômetro",
          nivel: null,
        },
        {
          id: "medidores_mecanicos",
          nome: "Medidores Mecânicos Avançados",
          nivel: null,
        },
        {
          id: "tolerancias_ajustes",
          nome: "Tolerâncias e Ajustes",
          nivel: null,
        },
        {
          id: "rugosidade_superficie",
          nome: "Rugosidade de Superfície",
          nivel: null,
        },
      ],
    },
    {
      id: "desenho_tecnico_mecanica",
      nome: "Desenho Técnico e Design",
      competencias: [
        {
          id: "leitura_desenho",
          nome: "Leitura de Desenhos Técnicos Mecânicos",
          nivel: null,
        },
        {
          id: "software_cad_mecanica",
          nome: "Software CAD Mecânico (AutoCAD, SolidWorks, Fusion 360)",
          nivel: null,
        },
        {
          id: "calculo_resistencia",
          nome: "Cálculo de Resistência e Análise Estrutural",
          nivel: null,
        },
      ],
    },
    {
      id: "seguranca_mecanica",
      nome: "Normas e Segurança",
      competencias: [
        {
          id: "nr12_mecanica",
          nome: "NR-12 (Proteção de Máquinas)",
          nivel: null,
        },
        {
          id: "iso_13849",
          nome: "ISO 13849-1 (Segurança de Máquinas)",
          nivel: null,
        },
        {
          id: "epi_mecanica",
          nome: "EPI e Segurança em Espaços Confinados",
          nivel: null,
        },
      ],
    },
  ],
}

// ============================================================================
// EXPORT TODAS AS ÁREAS
// ============================================================================
export const TODAS_AREAS: Area[] = [
  AREA_AUTOMACAO,
  AREA_CALDEIRARIA_SOLDA,
  AREA_ELETRICA,
  AREA_INSTRUMENTACAO,
  AREA_MECANICA,
]

// Função auxiliar para obter área por ID
export function getAreaById(areaId: string): Area | undefined {
  return TODAS_AREAS.find((area) => area.id === areaId)
}

// Função auxiliar para obter categorias de uma área
export function getCategoriasArea(areaId: string): CategoriaCompetencias[] {
  const area = getAreaById(areaId)
  return area ? area.categorias : []
}

/**
 * NOTA IMPORTANTE:
 * 
 * Os documentos PDF de autoavaliação (AUTOMAÇÃO e CALDEIRARIA E SOLDA)
 * definem a estrutura exata de competências e indicadores comportamentais
 * por nível que devem ser usados durante o processo de autoavaliação dos candidatos.
 * 
 * Para atualizar as competências com base nos documentos:
 * 1. Consulte os PDFs para a lista completa de competências
 * 2. Adicione os indicadores específicos (N1-N4) para cada competência
 * 3. Use como base para testes práticos e avaliação de evidências
 * 
 * Metodologia de Avaliação (conforme documentos):
 * - 20-30%: Prova teórica (conceitos, normas)
 * - 40-50%: Prova prática (bancada/simulador/campo)
 * - 10-20%: Estudo de caso (RCA, FMEA, MOC)
 * - 10-20%: Evidências documentais (OS, relatórios, commits)
 */
