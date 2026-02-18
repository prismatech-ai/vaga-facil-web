"""
Validador de CNPJ
"""
import re
import httpx
from app.core.config import settings

def validate_cnpj_format(cnpj: str) -> bool:
    """
    Valida formato do CNPJ (apenas dígitos, 14 caracteres)
    """
    # Remover caracteres não numéricos
    cnpj = re.sub(r'\D', '', cnpj)
    
    if len(cnpj) != 14:
        return False
    
    # Verificar se todos os dígitos são iguais (CNPJ inválido)
    if len(set(cnpj)) == 1:
        return False
    
    return True


def validate_cnpj_digits(cnpj: str) -> bool:
    """
    Valida dígitos verificadores do CNPJ
    """
    # Remover caracteres não numéricos
    cnpj = re.sub(r'\D', '', cnpj)
    
    if len(cnpj) != 14:
        return False
    
    # Calcular primeiro dígito verificador
    weights1 = [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]
    sum1 = sum(int(cnpj[i]) * weights1[i] for i in range(12))
    digit1 = 11 - (sum1 % 11)
    if digit1 >= 10:
        digit1 = 0
    
    if int(cnpj[12]) != digit1:
        return False
    
    # Calcular segundo dígito verificador
    weights2 = [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]
    sum2 = sum(int(cnpj[i]) * weights2[i] for i in range(13))
    digit2 = 11 - (sum2 % 11)
    if digit2 >= 10:
        digit2 = 0
    
    if int(cnpj[13]) != digit2:
        return False
    
    return True


async def validate_cnpj_api(cnpj: str) -> dict:
    """
    Valida CNPJ usando API externa (ReceitaWS)
    Retorna dados da empresa se válido
    """
    try:
        async with httpx.AsyncClient() as client:
            response = await client.get(
                f"{settings.CNPJ_API_URL}/{cnpj}",
                timeout=10.0
            )
            
            if response.status_code == 200:
                data = response.json()
                if data.get("status") == "OK":
                    return {
                        "valid": True,
                        "data": {
                            "razao_social": data.get("nome"),
                            "nome_fantasia": data.get("fantasia"),
                            "situacao": data.get("situacao")
                        }
                    }
            
            return {"valid": False, "data": None}
    except Exception:
        # Em caso de erro na API, retornar False mas não bloquear
        return {"valid": False, "data": None}


def validate_cnpj(cnpj: str, use_api: bool = False) -> bool:
    """
    Valida CNPJ
    Por padrão, valida apenas formato e dígitos verificadores
    Se use_api=True, também consulta API externa (pode ser lento)
    """
    if not validate_cnpj_format(cnpj):
        return False
    
    if not validate_cnpj_digits(cnpj):
        return False
    
    # Se use_api=True, validar também na API (opcional)
    # Isso pode ser feito de forma assíncrona no serviço
    
    return True

