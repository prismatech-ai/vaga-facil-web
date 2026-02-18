"""
Serviço para importar questões de testes via CSV/XLSX
"""
from io import BytesIO
import csv
from typing import List, Tuple, Dict, Any
from sqlalchemy.orm import Session

try:
    import openpyxl
    HAS_OPENPYXL = True
except ImportError:
    HAS_OPENPYXL = False

from app.models.test import Test, Question, Alternative, TestLevel
from fastapi import HTTPException, status


class TestImportService:
    """Serviço para importar questões de arquivos Excel/CSV"""
    
    # Colunas esperadas no arquivo
    REQUIRED_COLUMNS = [
        "habilidade",      # Ex: Python, React, JavaScript
        "nivel",           # Ex: Básico, Intermediário, Avançado
        "pergunta",        # Texto da questão
        "opcao_a",         # Primeira alternativa
        "opcao_b",         # Segunda alternativa
        "opcao_c",         # Terceira alternativa
        "opcao_d",         # Quarta alternativa
        "resposta_correta" # A, B, C ou D
    ]
    
    NIVEL_MAP = {
        "basico": TestLevel.basico,
        "básico": TestLevel.basico,
        "intermediário": TestLevel.intermediario,
        "intermediario": TestLevel.intermediario,
        "avançado": TestLevel.avancado,
        "avancado": TestLevel.avancado
    }
    
    @staticmethod
    def ler_excel(arquivo_bytes: bytes) -> List[Dict[str, str]]:
        """Lê dados de um arquivo Excel"""
        if not HAS_OPENPYXL:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Suporte a Excel não instalado. Instale: pip install openpyxl"
            )
        
        try:
            workbook = openpyxl.load_workbook(BytesIO(arquivo_bytes))
            worksheet = workbook.active
            
            # Extrair cabeçalhos
            headers = []
            for cell in worksheet[1]:
                headers.append(cell.value.lower().strip() if cell.value else "")
            
            # Validar cabeçalhos
            TestImportService._validar_headers(headers)
            
            # Extrair dados
            dados = []
            for row_idx, row in enumerate(worksheet.iter_rows(min_row=2, values_only=False), start=2):
                linha = {}
                for col_idx, cell in enumerate(row):
                    if col_idx < len(headers):
                        valor = cell.value
                        if valor is not None:
                            linha[headers[col_idx]] = str(valor).strip()
                        else:
                            linha[headers[col_idx]] = ""
                
                if any(linha.values()):  # Ignorar linhas vazias
                    dados.append(linha)
            
            return dados
        
        except openpyxl.utils.exceptions.InvalidFileException as e:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Arquivo Excel inválido: {str(e)}"
            )
        except Exception as e:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Erro ao ler Excel: {str(e)}"
            )
    
    @staticmethod
    def ler_csv(arquivo_bytes: bytes) -> List[Dict[str, str]]:
        """Lê dados de um arquivo CSV"""
        try:
            texto = arquivo_bytes.decode('utf-8')
            reader = csv.DictReader(texto.splitlines())
            
            if not reader.fieldnames:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Arquivo CSV está vazio"
                )
            
            # Normalizar nomes de colunas
            headers = [h.lower().strip() for h in reader.fieldnames]
            TestImportService._validar_headers(headers)
            
            # Extrair dados
            dados = []
            for row in reader:
                linha = {k.lower().strip(): v.strip() for k, v in row.items()}
                if any(linha.values()):  # Ignorar linhas vazias
                    dados.append(linha)
            
            return dados
        
        except UnicodeDecodeError:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Arquivo deve estar em UTF-8. Tente salvar em UTF-8 no Excel/LibreOffice"
            )
        except Exception as e:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Erro ao ler CSV: {str(e)}"
            )
    
    @staticmethod
    def _validar_headers(headers: List[str]) -> None:
        """Valida se as colunas obrigatórias estão presentes"""
        headers_lower = [h.lower() for h in headers]
        faltantes = [col for col in TestImportService.REQUIRED_COLUMNS if col not in headers_lower]
        
        if faltantes:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Colunas obrigatórias faltando: {', '.join(faltantes)}\n"
                       f"Colunas esperadas: {', '.join(TestImportService.REQUIRED_COLUMNS)}"
            )
    
    @staticmethod
    def validar_linha(linha: Dict[str, str], linha_num: int) -> Tuple[bool, str]:
        """
        Valida uma linha de dados
        Retorna (é_válida, mensagem_erro)
        """
        # Campos obrigatórios
        if not linha.get("habilidade"):
            return False, f"Linha {linha_num}: Campo 'habilidade' vazio"
        
        if not linha.get("nivel"):
            return False, f"Linha {linha_num}: Campo 'nivel' vazio"
        
        if not linha.get("pergunta"):
            return False, f"Linha {linha_num}: Campo 'pergunta' vazio"
        
        # Validar nível
        nivel_normalizado = linha.get("nivel", "").lower().strip()
        if nivel_normalizado not in TestImportService.NIVEL_MAP:
            niveis_validos = list(TestImportService.NIVEL_MAP.keys())
            return False, f"Linha {linha_num}: Nível inválido '{nivel_normalizado}'. Válidos: {niveis_validos}"
        
        # Validar alternativas
        for letra in ['a', 'b', 'c', 'd']:
            if not linha.get(f"opcao_{letra}"):
                return False, f"Linha {linha_num}: Campo 'opcao_{letra}' vazio"
        
        # Validar resposta correta
        resposta = linha.get("resposta_correta", "").upper()
        if resposta not in ['A', 'B', 'C', 'D']:
            return False, f"Linha {linha_num}: Resposta correta deve ser A, B, C ou D. Recebido: '{resposta}'"
        
        return True, ""
    
    @staticmethod
    def importar_questoes(
        dados: List[Dict[str, str]],
        db: Session,
        admin_user_id: int
    ) -> Dict[str, Any]:
        """
        Importa questões do arquivo processado
        Retorna estatísticas da importação
        """
        stats = {
            "total_linhas": len(dados),
            "questoes_criadas": 0,
            "testes_criados": 0,
            "alternativas_criadas": 0,
            "erros": [],
            "avisos": []
        }
        
        # Agrupar por habilidade + nível para criar testes
        testes_map = {}  # (habilidade, nivel) -> test_id
        
        for linha_num, linha in enumerate(dados, start=2):  # Começa em 2 (linha 1 é header)
            # Validar linha
            valida, erro = TestImportService.validar_linha(linha, linha_num)
            if not valida:
                stats["erros"].append(erro)
                continue
            
            try:
                habilidade = linha.get("habilidade", "").strip()
                nivel_str = linha.get("nivel", "").lower().strip()
                nivel = TestImportService.NIVEL_MAP[nivel_str]
                pergunta = linha.get("pergunta", "").strip()
                
                # Chave para agrupar testes
                chave_teste = (habilidade, nivel_str)
                
                # Criar teste se não existe
                if chave_teste not in testes_map:
                    teste_existente = db.query(Test).filter(
                        Test.habilidade.ilike(f"%{habilidade}%"),
                        Test.nivel == nivel
                    ).first()
                    
                    if teste_existente:
                        test_id = teste_existente.id
                        stats["avisos"].append(
                            f"Utilizando teste existente para '{habilidade}' ({nivel_str})"
                        )
                    else:
                        novo_teste = Test(
                            nome=f"{habilidade} - {nivel.value}",
                            habilidade=habilidade,
                            nivel=nivel,
                            descricao=f"Teste de {habilidade} importado via CSV/Excel",
                            created_by=admin_user_id
                        )
                        db.add(novo_teste)
                        db.flush()
                        test_id = novo_teste.id
                        stats["testes_criados"] += 1
                    
                    testes_map[chave_teste] = test_id
                
                # Criar questão
                questao = Question(
                    test_id=testes_map[chave_teste],
                    texto_questao=pergunta,
                    ordem=len([q for q in db.query(Question).filter(
                        Question.test_id == testes_map[chave_teste]
                    ).all()]) + 1
                )
                db.add(questao)
                db.flush()
                stats["questoes_criadas"] += 1
                
                # Criar alternativas
                resposta_correta = linha.get("resposta_correta", "").upper()
                for i, letra in enumerate(['a', 'b', 'c', 'd']):
                    texto_alt = linha.get(f"opcao_{letra}", "").strip()
                    é_correta = (letra.upper() == resposta_correta)
                    
                    alternativa = Alternative(
                        question_id=questao.id,
                        texto=texto_alt,
                        is_correct=é_correta,
                        ordem=i
                    )
                    db.add(alternativa)
                    stats["alternativas_criadas"] += 1
                
            except Exception as e:
                stats["erros"].append(f"Linha {linha_num}: Erro ao processar - {str(e)}")
        
        # Commit se houver mudanças
        if stats["questoes_criadas"] > 0 or stats["testes_criados"] > 0:
            db.commit()
        
        return stats
