"""
Motor de resolución de slots para el sistema de items de Waifuku.

Patrón reconocido: {{TipoSlot:valor_default}}
  - TipoSlot  — nombre libre, alfanumérico + guiones bajos
  - valor_default — texto plano usado cuando ningún item activo resuelve ese slot

Regla de prioridad: si dos items activos tienen el mismo type, gana el de mayor `priority`.
Los marcadores {{char}} y {{user}} (sin dos puntos) NO son slots — el regex los ignora.
"""
import re
from typing import List
from backend.core.item import Item

SLOT_RE = re.compile(r'\{\{([A-Za-z0-9_]+):([^}]*)\}\}')


def _build_type_map(active_items: List[Item]) -> dict[str, Item]:
    """Devuelve {type: item_de_mayor_prioridad} para los items activos."""
    type_map: dict[str, Item] = {}
    for item in active_items:
        if item.type not in type_map or item.priority > type_map[item.type].priority:
            type_map[item.type] = item
    return type_map


def resolve_text(text: str, type_map: dict[str, Item]) -> str:
    """Reemplaza {{Type:default}} por el valor del item activo o por el default."""
    def replacer(m: re.Match) -> str:
        slot_type = m.group(1)
        default   = m.group(2)
        return type_map[slot_type].value if slot_type in type_map else default

    return SLOT_RE.sub(replacer, text)


def apply_effects(
    active_items: List[Item],
    *,
    system_prompt: str,
    description: str,
    personality: str,
    scenario: str,
    post_history: str,
    mes_example: str,
    first_mes: str,
    system_prompt_field: str,
    post_history_field: str,
) -> dict:
    """
    Aplica los effects de todos los items activos sobre los campos de la card.
    Devuelve un dict con los campos modificados.
    """
    fields = {
        "system_prompt":               system_prompt,
        "description":                 description,
        "personality":                 personality,
        "scenario":                    scenario,
        "post_history":                post_history,
        "mes_example":                 mes_example,
        "first_mes":                   first_mes,
        "system_prompt_field":         system_prompt_field,
        "post_history_field":          post_history_field,
    }

    # Ordenar items por prioridad descendente para que los de mayor prioridad
    # apliquen sus field: reemplazos después (el último en order gana en campos completos)
    for item in sorted(active_items, key=lambda i: i.priority):
        for effect in item.effects:
            t = effect.target
            c = effect.content

            if t == "system":
                fields["system_prompt"] = (fields["system_prompt"] + "\n\n" + c).strip()
            elif t == "personality":
                fields["personality"] = (fields["personality"] + "\n\n" + c).strip()
            elif t == "scenario":
                fields["scenario"] = (fields["scenario"] + "\n\n" + c).strip()
            elif t == "post_history":
                fields["post_history"] = (fields["post_history"] + "\n\n" + c).strip()
            elif t == "field:description":
                fields["description"] = c
            elif t == "field:personality":
                fields["personality"] = c
            elif t == "field:scenario":
                fields["scenario"] = c
            elif t == "field:mes_example":
                fields["mes_example"] = c
            elif t == "field:first_mes":
                fields["first_mes"] = c
            elif t == "field:system_prompt":
                fields["system_prompt_field"] = c
            elif t == "field:post_history_instructions":
                fields["post_history_field"] = c

    return fields


def resolve_character(character, active_items: List[Item]) -> dict:
    """
    Punto de entrada principal. Recibe un Character y la lista de items activos.
    Devuelve un dict con todos los campos de texto ya resueltos.
    """
    if not active_items:
        return {
            "system_prompt":       character.system_prompt,
            "description":         character.description,
            "personality":         character.personality,
            "scenario":            character.scenario,
            "post_history":        character.post_history_instructions,
            "mes_example":         character.mes_example,
            "first_mes":           character.first_mes,
            "character_reminder":  getattr(character, "character_reminder", ""),
        }

    type_map = _build_type_map(active_items)

    # 1. Resolver slots inline en todos los campos de texto
    resolved = {
        "system_prompt":       resolve_text(character.system_prompt, type_map),
        "description":         resolve_text(character.description,   type_map),
        "personality":         resolve_text(character.personality,   type_map),
        "scenario":            resolve_text(character.scenario,      type_map),
        "post_history":        resolve_text(character.post_history_instructions, type_map),
        "mes_example":         resolve_text(character.mes_example,   type_map),
        "first_mes":           resolve_text(character.first_mes,     type_map),
        "character_reminder":  resolve_text(getattr(character, "character_reminder", ""), type_map),
    }

    # 2. Aplicar effects (append y field replace)
    fields_after = apply_effects(
        active_items,
        system_prompt      = resolved["system_prompt"],
        description        = resolved["description"],
        personality        = resolved["personality"],
        scenario           = resolved["scenario"],
        post_history       = resolved["post_history"],
        mes_example        = resolved["mes_example"],
        first_mes          = resolved["first_mes"],
        system_prompt_field= resolved["system_prompt"],
        post_history_field = resolved["post_history"],
    )

    return {
        "system_prompt":       fields_after["system_prompt_field"] or fields_after["system_prompt"],
        "description":         fields_after["description"],
        "personality":         fields_after["personality"],
        "scenario":            fields_after["scenario"],
        "post_history":        fields_after["post_history_field"] or fields_after["post_history"],
        "mes_example":         fields_after["mes_example"],
        "first_mes":           fields_after["first_mes"],
        "character_reminder":  resolved["character_reminder"],
    }
