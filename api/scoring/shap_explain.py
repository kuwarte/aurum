"""
SHAP EXPLAINER FOR CREDIT SCORING MODEL

Provides feature-level breakdown showing which credit dimensions contributed
to the final credit score. Uses TreeExplainer on the XGBoost model.
"""

import numpy as np
import shap
from typing import Dict
from scoring.model import get_model


class SHAPExplainer:
    """SHAP TreeExplainer wrapper for credit scoring."""
    
    def __init__(self):
        self.explainer = None
        self._background_data = None
    
    def _get_explainer(self):
        """Lazy-initialize SHAP explainer on first use."""
        if self.explainer is None:
            model = get_model()
            
            X_bg = np.array([
                [70, 60, 50, 40, 30, 75],
                [80, 75, 65, 50, 40, 85],
                [60, 50, 40, 30, 20, 60],
                [90, 85, 75, 60, 50, 90],
                [50, 40, 30, 20, 10, 50],
            ])
            
            self.explainer = shap.TreeExplainer(
                model.model,
                data=shap.sample(X_bg, 5) if len(X_bg) > 5 else X_bg
            )
        
        return self.explainer
    
    def explain(self, wallet_data: Dict[str, float]) -> Dict[str, float]:
        """
        Generate SHAP-based feature breakdown explaining credit score.
        Returns dict mapping feature names to SHAP values (contribution to score).
        Positive values increase score, negative values decrease score.
        """
        explainer = self._get_explainer()
        model = get_model()
        
        features = np.array([[
            wallet_data.get("repayment", 70),
            wallet_data.get("wallet_activity", 60),
            wallet_data.get("defi", 50),
            wallet_data.get("dao", 40),
            wallet_data.get("rwa", 30),
            wallet_data.get("income", 75),
        ]])
        
        features = np.clip(features, 0, 100)
        
        shap_values = explainer.shap_values(features)
        
        if isinstance(shap_values, list):
            shap_vals = shap_values[1][0]
        else:
            shap_vals = shap_values[0]
        
        feature_names = [
            "repayment",
            "wallet_activity",
            "defi",
            "dao",
            "rwa",
            "income",
        ]
        
        shap_breakdown = {
            name: float(val * 100 / (np.max(np.abs(shap_vals)) + 1e-6))
            for name, val in zip(feature_names, shap_vals)
        }
        
        return shap_breakdown


_explainer = None

def get_explainer() -> SHAPExplainer:
    """Lazy-load and return global explainer instance."""
    global _explainer
    if _explainer is None:
        _explainer = SHAPExplainer()
    return _explainer


def explain_score(wallet_data: Dict[str, float]) -> Dict[str, float]:
    """Convenience function to get SHAP breakdown."""
    explainer = get_explainer()
    return explainer.explain(wallet_data)
