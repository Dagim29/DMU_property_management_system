"""QR Code encryption and generation service."""
import base64
import json
from datetime import datetime, timedelta
from cryptography.fernet import Fernet
from django.conf import settings
import qrcode
from io import BytesIO


class QRCodeService:
    """Handles QR code generation and validation with encryption."""
    
    def __init__(self):
        # Use Django SECRET_KEY for encryption (in production, use a separate key)
        key = base64.urlsafe_b64encode(settings.SECRET_KEY[:32].encode().ljust(32)[:32])
        self.cipher = Fernet(key)
    
    def encrypt_asset_id(self, asset_id: str) -> str:
        """
        Encrypt asset ID with timestamp and signature.
        
        Args:
            asset_id: The asset ID to encrypt
            
        Returns:
            Encrypted string that can be embedded in QR code
        """
        data = {
            'asset_id': asset_id,
            'timestamp': datetime.now().isoformat(),
            'expires': (datetime.now() + timedelta(hours=24)).isoformat()
        }
        
        json_data = json.dumps(data)
        encrypted = self.cipher.encrypt(json_data.encode())
        return base64.urlsafe_b64encode(encrypted).decode()
    
    def decrypt_qr_data(self, encrypted_data: str) -> dict:
        """
        Decrypt and validate QR code data.
        
        Args:
            encrypted_data: The encrypted QR code data
            
        Returns:
            Dictionary with asset_id, timestamp, and valid flag
        """
        try:
            # Decode from base64
            encrypted_bytes = base64.urlsafe_b64decode(encrypted_data.encode())
            
            # Decrypt
            decrypted = self.cipher.decrypt(encrypted_bytes)
            data = json.loads(decrypted.decode())
            
            # Check expiration
            expires = datetime.fromisoformat(data['expires'])
            is_valid = datetime.now() < expires
            
            return {
                'asset_id': data['asset_id'],
                'timestamp': data['timestamp'],
                'valid': is_valid,
                'expires': data['expires']
            }
        except Exception as e:
            return {
                'asset_id': None,
                'timestamp': None,
                'valid': False,
                'error': str(e)
            }
    
    def generate_qr_code(self, asset_id: str) -> bytes:
        """
        Generate QR code image with encrypted asset data.
        
        Args:
            asset_id: The asset ID to encode
            
        Returns:
            PNG image bytes
        """
        # Encrypt the asset ID
        encrypted_data = self.encrypt_asset_id(asset_id)
        
        # Create QR code
        qr = qrcode.QRCode(
            version=1,
            error_correction=qrcode.constants.ERROR_CORRECT_L,
            box_size=10,
            border=4,
        )
        qr.add_data(encrypted_data)
        qr.make(fit=True)
        
        # Generate image
        img = qr.make_image(fill_color="black", back_color="white")
        
        # Convert to bytes
        buffer = BytesIO()
        img.save(buffer, format='PNG')
        return buffer.getvalue()
    
    def generate_qr_code_with_logo(self, asset_id: str, logo_path: str = None) -> bytes:
        """
        Generate QR code with optional logo in center.
        
        Args:
            asset_id: The asset ID to encode
            logo_path: Optional path to logo image
            
        Returns:
            PNG image bytes
        """
        from PIL import Image
        
        # Encrypt the asset ID
        encrypted_data = self.encrypt_asset_id(asset_id)
        
        # Create QR code with higher error correction for logo
        qr = qrcode.QRCode(
            version=1,
            error_correction=qrcode.constants.ERROR_CORRECT_H,
            box_size=10,
            border=4,
        )
        qr.add_data(encrypted_data)
        qr.make(fit=True)
        
        # Generate image
        img = qr.make_image(fill_color="black", back_color="white").convert('RGB')
        
        # Add logo if provided
        if logo_path:
            try:
                logo = Image.open(logo_path)
                # Calculate logo size (10% of QR code)
                qr_width, qr_height = img.size
                logo_size = int(qr_width * 0.1)
                logo = logo.resize((logo_size, logo_size), Image.LANCZOS)
                
                # Calculate position (center)
                logo_pos = ((qr_width - logo_size) // 2, (qr_height - logo_size) // 2)
                img.paste(logo, logo_pos)
            except Exception as e:
                # If logo fails, continue without it
                pass
        
        # Convert to bytes
        buffer = BytesIO()
        img.save(buffer, format='PNG')
        return buffer.getvalue()


# Singleton instance
qr_service = QRCodeService()
