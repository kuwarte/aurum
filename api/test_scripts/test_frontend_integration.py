"""
Frontend API Test - Simulates frontend requests to the backend API
This verifies the API endpoints work as expected before frontend integration
"""

import requests
import json
import time

from wallet_env import get_test_wallet


API_BASE = "http://localhost:8000"


def test_health():
    """Test health endpoint"""
    print("\n" + "="*60)
    print("TEST 1: Health Check")
    print("="*60)
    
    try:
        response = requests.get(f"{API_BASE}/health")
        print(f"Status: {response.status_code}")
        print(f"Response: {json.dumps(response.json(), indent=2)}")
        return response.status_code == 200
    except Exception as e:
        print(f"[x] Error: {e}")
        return False


def test_config():
    """Test config endpoint"""
    print("\n" + "="*60)
    print("TEST 2: Configuration")
    print("="*60)
    
    try:
        response = requests.get(f"{API_BASE}/config")
        print(f"Status: {response.status_code}")
        print(f"Response: {json.dumps(response.json(), indent=2)}")
        return response.status_code == 200
    except Exception as e:
        print(f"[x] Error: {e}")
        return False


def test_assess():
    """Test credit assessment endpoint - what frontend will call"""
    print("\n" + "="*60)
    print("TEST 3: Credit Assessment (Main Frontend Call)")
    print("="*60)
    
    test_wallet = get_test_wallet()
    
    payload = {
        "wallet_address": test_wallet
    }
    
    print(f"Requesting assessment for: {test_wallet}")
    print("Please wait... (this may take 10-20 seconds)")
    
    try:
        start_time = time.time()
        response = requests.post(
            f"{API_BASE}/assess",
            json=payload,
            headers={"Content-Type": "application/json"},
            timeout=60
        )
        elapsed = time.time() - start_time
        
        print(f"\nStatus: {response.status_code}")
        print(f"Response time: {elapsed:.2f}s")
        
        if response.status_code == 200:
            result = response.json()
            print("\n" + "-"*60)
            print("CREDIT ASSESSMENT RESULT")
            print("-"*60)
            print(f"Wallet: {test_wallet}")
            print(f"Credit Score: {result.get('score')}/1000")
            print(f"Risk Tier: {result.get('tier')}")
            print(f"Default Probability (30d): {result.get('default_prob')*100:.1f}%")
            print(f"Transaction Hash: {result.get('tx_hash')}")
            print(f"Credential Active: {result.get('active')}")
            print(f"\nLoan Offers: {len(result.get('loan_offers', []))} available")
            for offer in result.get('loan_offers', []):
                print(f"  - {offer.get('protocol')}: {offer.get('rate')} up to ${offer.get('max_loan')}")
            
            print(f"\nSHAP Feature Importance:")
            for feature, value in result.get('shap', {}).items():
                print(f"  - {feature}: {value:.2f}")
            
            print("-"*60)
            print("\n[/] Assessment successful! Frontend can use this data.")
            return True
        else:
            print(f"[x] Error: {response.text}")
            return False
            
    except requests.exceptions.Timeout:
        print("[x] Request timed out after 60 seconds")
        return False
    except Exception as e:
        print(f"[x] Error: {e}")
        return False


def main():
    print("\n" + "="*60)
    print("AURUM API FRONTEND INTEGRATION TEST")
    print("="*60)
    print("\nThis test simulates what the frontend will do:")
    print("1. Check API health")
    print("2. Get configuration")
    print("3. Request credit assessment")
    print("\nMake sure the API server is running:")
    print("  cd /home/kuwarte/agentic-buildathon/aurum/api")
    print("  source .venv/bin/activate")
    print("  uvicorn main:app --reload --host 0.0.0.0 --port 8000")
    
    input("\nPress Enter when API server is running...")
    
    results = []
    results.append(("Health Check", test_health()))
    results.append(("Config Check", test_config()))
    results.append(("Credit Assessment", test_assess()))
    
    print("\n" + "="*60)
    print("TEST SUMMARY")
    print("="*60)
    for test_name, passed in results:
        status = "[/] PASS" if passed else "[x] FAIL"
        print(f"{test_name}: {status}")
    
    all_passed = all(result[1] for result in results)
    
    if all_passed:
        print("\n[/] All tests passed! Frontend integration ready.")
        print("\nAPI Endpoints for Frontend:")
        print(f"  GET  {API_BASE}/health")
        print(f"  GET  {API_BASE}/config")
        print(f"  POST {API_BASE}/assess")
        print(f"\nDocs: {API_BASE}/docs")
    else:
        print("\n[!]  Some tests failed. Check the API server logs.")
    
    print("="*60)


if __name__ == "__main__":
    main()
