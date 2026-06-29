"""
Auto-descubre herramientas agénticas en backend/agents/tools/.
Cada subdirectorio con un tool.py que define una subclase de BaseTool
queda registrado automáticamente — no hay que editar este archivo.
"""
import importlib
import logging
import pkgutil
from pathlib import Path

from backend.agents.base_tool import BaseTool

log = logging.getLogger(__name__)

_registry: dict[str, BaseTool] = {}


def _discover() -> None:
    tools_dir = Path(__file__).parent / "tools"
    if not tools_dir.exists():
        return
    for finder, pkg_name, ispkg in pkgutil.iter_modules([str(tools_dir)]):
        if not ispkg:
            continue
        try:
            mod = importlib.import_module(f"backend.agents.tools.{pkg_name}.tool")
            for attr in vars(mod).values():
                if (
                    isinstance(attr, type)
                    and issubclass(attr, BaseTool)
                    and attr is not BaseTool
                ):
                    instance = attr()
                    _registry[instance.name] = instance
                    log.debug(f"Tool registrada: {instance.name}")
        except Exception as e:
            log.warning(f"Error cargando tool '{pkg_name}': {e}")


_discover()


def get_tool(name: str) -> BaseTool | None:
    return _registry.get(name)


def get_all_tools() -> dict[str, BaseTool]:
    return dict(_registry)
