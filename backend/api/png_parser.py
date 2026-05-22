"""
Parser para character cards embebidas en PNG (formato SillyTavern).
El JSON se almacena en el chunk tEXt con keyword 'chara', codificado en base64.
"""
import struct
import base64
import json


def extract_chara_from_png(data: bytes) -> dict:
    if data[:8] != b'\x89PNG\r\n\x1a\n':
        raise ValueError("El archivo no es un PNG válido")

    pos = 8
    while pos < len(data):
        if pos + 8 > len(data):
            break
        length = struct.unpack('>I', data[pos:pos + 4])[0]
        chunk_type = data[pos + 4:pos + 8].decode('ascii', errors='ignore')
        chunk_data = data[pos + 8:pos + 8 + length]

        if chunk_type == 'tEXt':
            sep = chunk_data.find(b'\x00')
            if sep != -1:
                keyword = chunk_data[:sep].decode('latin-1')
                value = chunk_data[sep + 1:]
                if keyword == 'chara':
                    return json.loads(base64.b64decode(value))

        pos += 12 + length

    raise ValueError("No se encontró metadata de personaje en el PNG")


def detect_card_version(raw: dict) -> str:
    if raw.get("spec") == "chara_card_v2":
        return "v2"
    return "v1"
