"""
XGBOOST CREDIT SCORING MODEL (w/ SYNTHETIC TRAINING DATA)

Scores wallets on a scale of 0-1000 based on six credit dimensions:
  - repayment: Historical loan repayment records
  - wallet_activity: Transaction frequency and volume consistency
  - defi: DeFi participation (LPs, yield strategies, staking)
  - dao: DAO governance participation (voting, proposals)
  - rwa: Real-world asset holdings (invoices, rental income, receivables)
  - income: Income regularity and growth (stablecoin/CSPR inflows)

Training data is synthetically generated with realistic distributions.
"""

import numpy as np
import xgboost as xgb
from typing import Tuple, Dict


def generate_synthetic_training_data(n_samples: int = 500) -> Tuple[np.ndarray, np.ndarray]:
    """
    Generate realistic synthetic wallet profiles for training.
    Returns (features, labels) where labels are binary (default=1, repay=0).
    """
    np.random.seed(42)
    
    features = []
    labels = []
    
    for i in range(n_samples):
        repayment_score = np.random.beta(8, 2) * 100
        wallet_activity = np.random.normal(70, 15)
        defi_engagement = np.random.normal(60, 20)
        dao_participation = np.random.normal(50, 25)
        rwa_ownership = np.random.normal(40, 20)
        income_consistency = np.random.normal(75, 15)
        
        features.append([
            np.clip(repayment_score, 0, 100),
            np.clip(wallet_activity, 0, 100),
            np.clip(defi_engagement, 0, 100),
            np.clip(dao_participation, 0, 100),
            np.clip(rwa_ownership, 0, 100),
            np.clip(income_consistency, 0, 100),
        ])
        
        avg_score = np.mean(features[-1])
        default_prob = (100 - avg_score) / 100
        
        label = 1 if (np.random.random() < default_prob + np.random.normal(0, 0.1)) else 0
        labels.append(label)
    
    return np.array(features), np.array(labels)


class CreditScoreModel:
    """XGBoost model for credit scoring."""
    
    def __init__(self):
        self.model = None
        self.feature_names = [
            "repayment",
            "wallet_activity",
            "defi",
            "dao",
            "rwa",
            "income",
        ]
    
    def train(self):
        """Train model on synthetic data."""
        X, y = generate_synthetic_training_data(n_samples=500)
        
        self.model = xgb.XGBClassifier(
            n_estimators=100,
            max_depth=5,
            learning_rate=0.1,
            random_state=42,
            objective="binary:logistic",
            eval_metric="logloss",
            verbosity=0,
        )
        
        self.model.fit(X, y, verbose=False)
    
    def predict(self, wallet_data: Dict[str, float]) -> Tuple[int, Dict[str, float]]:
        """
        Predict credit score (0-1000) and sub-scores (0-100 per dimension).
        Returns (credit_score: int, sub_scores: dict).
        """
        if self.model is None:
            self.train()
        
        features = np.array([[
            wallet_data.get("repayment", 70),
            wallet_data.get("wallet_activity", 60),
            wallet_data.get("defi", 50),
            wallet_data.get("dao", 40),
            wallet_data.get("rwa", 30),
            wallet_data.get("income", 75),
        ]])
        
        features = np.clip(features, 0, 100)
        
        default_prob = float(self.model.predict_proba(features)[0][1])
        base_score = (1 - default_prob) * 1000
        weighted_score = base_score * 0.7 + np.mean(features[0]) * 10 * 0.3
        credit_score = int(np.clip(weighted_score, 0, 1000))
        
        sub_scores = {
            name: int(np.clip(features[0][i], 0, 100))
            for i, name in enumerate(self.feature_names)
        }
        
        return credit_score, sub_scores
    
    def predict_proba(self, wallet_data: Dict[str, float]) -> float:
        """Get default probability (0-1) for a wallet."""
        if self.model is None:
            self.train()
        
        features = np.array([[
            wallet_data.get("repayment", 70),
            wallet_data.get("wallet_activity", 60),
            wallet_data.get("defi", 50),
            wallet_data.get("dao", 40),
            wallet_data.get("rwa", 30),
            wallet_data.get("income", 75),
        ]])
        
        features = np.clip(features, 0, 100)
        return float(self.model.predict_proba(features)[0][1])
    
    def get_feature_importance(self) -> Dict[str, float]:
        """Get XGBoost feature importance as dict."""
        if self.model is None:
            self.train()
        
        importance = self.model.feature_importances_
        return {
            name: float(imp)
            for name, imp in zip(self.feature_names, importance)
        }


_model = None

def get_model() -> CreditScoreModel:
    """Lazy-load and return global model instance."""
    global _model
    if _model is None:
        _model = CreditScoreModel()
        _model.train()
    return _model
