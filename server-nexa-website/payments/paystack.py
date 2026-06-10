import requests
from django.conf import settings

class PaystackProvider:
    def __init__(self):
        self.secret_key = getattr(settings, 'PAYSTACK_SECRET_KEY', None)
        self.base_url = 'https://api.paystack.co'
        self.headers = {
            'Authorization': f'Bearer {self.secret_key}',
            'Content-Type': 'application/json',
        }

    def initialize_transaction(self, email, amount, reference, callback_url=None, metadata=None):
        """
        Initialize a Paystack transaction
        amount: in standard currency (e.g. KES) - Paystack expects sub-units (cents)
        Note: For KES, Paystack uses cents (x100)
        """
        url = f'{self.base_url}/transaction/initialize'
        
        # Paystack KES uses cents
        amount_in_cents = int(float(amount) * 100)
        
        payload = {
            'email': email,
            'amount': amount_in_cents,
            'reference': reference,
            'currency': 'KES',
        }
        
        if callback_url:
            payload['callback_url'] = callback_url
        if metadata:
            payload['metadata'] = metadata
            
        response = requests.post(url, headers=self.headers, json=payload)
        return response.json()

    def verify_transaction(self, reference):
        """
        Verify a transaction via reference
        """
        url = f'{self.base_url}/transaction/verify/{reference}'
        response = requests.get(url, headers=self.headers)
        return response.json()
