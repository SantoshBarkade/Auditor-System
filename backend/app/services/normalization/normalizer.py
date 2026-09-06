from typing import Dict, Any, Tuple
from backend.app.services.vendor_detection.detector import VendorDetector
from backend.app.services.parsers.cisco import CiscoParser
from backend.app.services.parsers.fortigate import FortiGateParser
from backend.app.services.parsers.juniper import JuniperParser
from backend.app.schemas.normalized import NormalizedConfiguration

class NormalizerService:
    """
    Central Normalization Layer for NEXORA.
    Orchestrates vendor detection and dispatches to the appropriate vendor parser
    to produce the unified NormalizedConfiguration model.
    """

    PARSERS = {
        "Cisco": CiscoParser(),
        "Fortinet": FortiGateParser(),
        "Juniper": JuniperParser()
    }

    @classmethod
    def normalize_configuration(cls, raw_content: str, filename: str = "", vendor_override: str = None) -> Tuple[str, NormalizedConfiguration, Dict[str, Any]]:
        # Detect vendor if not explicitly given
        if not vendor_override or vendor_override == "Auto-Detect":
            detection = VendorDetector.detect(raw_content, filename)
            vendor = detection.vendor
        else:
            v_lower = vendor_override.strip().lower()
            if "cisco" in v_lower:
                vendor = "Cisco"
            elif "forti" in v_lower:
                vendor = "Fortinet"
            elif "juniper" in v_lower or "junos" in v_lower:
                vendor = "Juniper"
            else:
                vendor = vendor_override.capitalize()

        parser = cls.PARSERS.get(vendor, cls.PARSERS["Cisco"])

        parsed_ast = parser.parse(raw_content)
        normalized_model = parser.normalize(parsed_ast, raw_content)

        return vendor, normalized_model, parsed_ast

    @classmethod
    def get_parser(cls, vendor: str):
        return cls.PARSERS.get(vendor, cls.PARSERS["Cisco"])
