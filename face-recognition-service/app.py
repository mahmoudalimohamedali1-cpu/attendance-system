"""
خدمة التعرف على الوجه - Face Recognition Service
تستخدم مكتبة DeepFace للتعرف على الوجوه ومقارنتها
"""

import os
import base64
import json
from io import BytesIO
from flask import Flask, request, jsonify
from flask_cors import CORS
import numpy as np
from PIL import Image
from dotenv import load_dotenv

load_dotenv()

app = Flask(__name__)
CORS(app)

# تحميل DeepFace بشكل كسول لتسريع بدء التشغيل
deepface = None

def get_deepface():
    global deepface
    if deepface is None:
        from deepface import DeepFace
        deepface = DeepFace
    return deepface

# إعدادات
MATCH_THRESHOLD = float(os.getenv('MATCH_THRESHOLD', '0.6'))
MODEL_NAME = os.getenv('MODEL_NAME', 'Facenet512')  # نموذج دقيق
DETECTOR_BACKEND = os.getenv('DETECTOR_BACKEND', 'opencv')  # أسرع
MAX_IMAGE_SIZE = int(os.getenv('MAX_IMAGE_SIZE', '10485760'))


def decode_base64_image(base64_string: str) -> np.ndarray:
    """تحويل صورة Base64 إلى numpy array"""
    if ',' in base64_string:
        base64_string = base64_string.split(',')[1]
    
    image_data = base64.b64decode(base64_string)
    image = Image.open(BytesIO(image_data))
    
    if image.mode != 'RGB':
        image = image.convert('RGB')
    
    return np.array(image)


def save_temp_image(image_array: np.ndarray) -> str:
    """حفظ الصورة مؤقتاً للمعالجة"""
    import tempfile
    img = Image.fromarray(image_array)
    temp_file = tempfile.NamedTemporaryFile(suffix='.jpg', delete=False)
    img.save(temp_file.name, 'JPEG', quality=95)
    return temp_file.name


def get_face_embedding(image: np.ndarray) -> dict:
    """استخراج embedding للوجه من الصورة"""
    temp_path = None
    try:
        DeepFace = get_deepface()
        
        # حفظ الصورة مؤقتاً
        temp_path = save_temp_image(image)
        
        # استخراج الـ embedding
        embeddings = DeepFace.represent(
            img_path=temp_path,
            model_name=MODEL_NAME,
            detector_backend=DETECTOR_BACKEND,
            enforce_detection=True,
            align=True
        )
        
        if not embeddings or len(embeddings) == 0:
            return {
                'success': False,
                'error': 'لم يتم العثور على وجه في الصورة',
                'error_code': 'NO_FACE_FOUND'
            }
        
        if len(embeddings) > 1:
            return {
                'success': False,
                'error': 'تم العثور على أكثر من وجه. يرجى التأكد من وجود وجه واحد فقط.',
                'error_code': 'MULTIPLE_FACES'
            }
        
        face_data = embeddings[0]
        embedding = face_data['embedding']
        
        return {
            'success': True,
            'embedding': embedding,
            'embedding_size': len(embedding),
            'face_location': face_data.get('facial_area', {})
        }
        
    except Exception as e:
        error_msg = str(e)
        if 'Face could not be detected' in error_msg:
            return {
                'success': False,
                'error': 'لم يتم العثور على وجه واضح في الصورة. تأكد من الإضاءة الجيدة ووضوح الوجه.',
                'error_code': 'NO_FACE_FOUND'
            }
        return {
            'success': False,
            'error': f'خطأ في معالجة الصورة: {error_msg}',
            'error_code': 'PROCESSING_ERROR'
        }
    finally:
        if temp_path and os.path.exists(temp_path):
            os.remove(temp_path)


def compare_faces(embedding1: list, embedding2: list) -> dict:
    """مقارنة وجهين"""
    try:
        arr1 = np.array(embedding1)
        arr2 = np.array(embedding2)
        
        # حساب التشابه بالكوساين
        dot_product = np.dot(arr1, arr2)
        norm1 = np.linalg.norm(arr1)
        norm2 = np.linalg.norm(arr2)
        
        if norm1 == 0 or norm2 == 0:
            cosine_similarity = 0
        else:
            cosine_similarity = dot_product / (norm1 * norm2)
        
        # تحويل إلى نطاق 0-1
        similarity = (cosine_similarity + 1) / 2
        
        # حساب المسافة الإقليدية
        distance = np.linalg.norm(arr1 - arr2)
        
        # تحديد التطابق بناءً على التشابه
        is_match = similarity >= MATCH_THRESHOLD
        
        # حساب الثقة
        confidence = similarity if is_match else similarity * 0.5
        
        return {
            'success': True,
            'is_match': is_match,
            'distance': float(distance),
            'similarity': float(similarity),
            'confidence': float(confidence),
            'threshold': MATCH_THRESHOLD
        }
        
    except Exception as e:
        return {
            'success': False,
            'error': f'خطأ في المقارنة: {str(e)}',
            'error_code': 'COMPARISON_ERROR'
        }


# ==================== API Endpoints ====================

@app.route('/health', methods=['GET'])
def health_check():
    """التحقق من حالة الخدمة"""
    return jsonify({
        'status': 'healthy',
        'service': 'Face Recognition Service (DeepFace)',
        'version': '1.0.0',
        'model': MODEL_NAME
    })


@app.route('/api/face/detect', methods=['POST'])
def detect_face():
    """اكتشاف الوجه واستخراج الـ embedding"""
    try:
        data = request.get_json()
        
        if not data or 'image' not in data:
            return jsonify({
                'success': False,
                'error': 'الصورة مطلوبة',
                'error_code': 'MISSING_IMAGE'
            }), 400
        
        image = decode_base64_image(data['image'])
        result = get_face_embedding(image)
        
        if result['success']:
            return jsonify(result), 200
        else:
            return jsonify(result), 400
            
    except Exception as e:
        return jsonify({
            'success': False,
            'error': f'خطأ في الخادم: {str(e)}',
            'error_code': 'SERVER_ERROR'
        }), 500


@app.route('/api/face/compare', methods=['POST'])
def compare_faces_endpoint():
    """مقارنة وجهين"""
    try:
        data = request.get_json()
        
        if not data:
            return jsonify({
                'success': False,
                'error': 'البيانات مطلوبة',
                'error_code': 'MISSING_DATA'
            }), 400
        
        embedding1 = None
        embedding2 = None
        
        # مقارنة صورتين
        if 'image1' in data and 'image2' in data:
            img1 = decode_base64_image(data['image1'])
            img2 = decode_base64_image(data['image2'])
            
            result1 = get_face_embedding(img1)
            if not result1['success']:
                return jsonify({
                    'success': False,
                    'error': f'خطأ في الصورة الأولى: {result1["error"]}',
                    'error_code': result1['error_code']
                }), 400
            
            result2 = get_face_embedding(img2)
            if not result2['success']:
                return jsonify({
                    'success': False,
                    'error': f'خطأ في الصورة الثانية: {result2["error"]}',
                    'error_code': result2['error_code']
                }), 400
            
            embedding1 = result1['embedding']
            embedding2 = result2['embedding']
        
        # مقارنة embedding مع صورة
        elif 'embedding' in data and 'image' in data:
            embedding1 = data['embedding']
            
            img = decode_base64_image(data['image'])
            result = get_face_embedding(img)
            if not result['success']:
                return jsonify(result), 400
            
            embedding2 = result['embedding']
        
        # مقارنة embedding-ين
        elif 'embedding1' in data and 'embedding2' in data:
            embedding1 = data['embedding1']
            embedding2 = data['embedding2']
        
        else:
            return jsonify({
                'success': False,
                'error': 'يجب توفير صورتين أو embedding مع صورة أو embedding-ين',
                'error_code': 'INVALID_INPUT'
            }), 400
        
        result = compare_faces(embedding1, embedding2)
        
        if result['success']:
            return jsonify(result), 200
        else:
            return jsonify(result), 400
            
    except Exception as e:
        return jsonify({
            'success': False,
            'error': f'خطأ في الخادم: {str(e)}',
            'error_code': 'SERVER_ERROR'
        }), 500


@app.route('/api/face/register', methods=['POST'])
def register_face():
    """تسجيل وجه جديد"""
    try:
        data = request.get_json()
        
        if not data or 'image' not in data:
            return jsonify({
                'success': False,
                'error': 'الصورة مطلوبة',
                'error_code': 'MISSING_IMAGE'
            }), 400
        
        image = decode_base64_image(data['image'])
        result = get_face_embedding(image)
        
        if result['success']:
            response = {
                'success': True,
                'message': 'تم تسجيل الوجه بنجاح',
                'embedding': result['embedding'],
                'embedding_size': result['embedding_size'],
                'face_location': result['face_location']
            }
            
            if 'user_id' in data:
                response['user_id'] = data['user_id']
            
            return jsonify(response), 200
        else:
            return jsonify(result), 400
            
    except Exception as e:
        return jsonify({
            'success': False,
            'error': f'خطأ في الخادم: {str(e)}',
            'error_code': 'SERVER_ERROR'
        }), 500


@app.route('/api/face/verify', methods=['POST'])
def verify_face():
    """التحقق من الوجه"""
    try:
        data = request.get_json()
        
        if not data:
            return jsonify({
                'success': False,
                'error': 'البيانات مطلوبة',
                'error_code': 'MISSING_DATA'
            }), 400
        
        if 'image' not in data:
            return jsonify({
                'success': False,
                'error': 'الصورة مطلوبة',
                'error_code': 'MISSING_IMAGE'
            }), 400
        
        if 'stored_embedding' not in data:
            return jsonify({
                'success': False,
                'error': 'الـ embedding المُسجل مطلوب',
                'error_code': 'MISSING_EMBEDDING'
            }), 400
        
        image = decode_base64_image(data['image'])
        result = get_face_embedding(image)
        
        if not result['success']:
            return jsonify(result), 400
        
        comparison = compare_faces(data['stored_embedding'], result['embedding'])
        
        return jsonify({
            'success': True,
            'verified': comparison['is_match'],
            'confidence': comparison['confidence'],
            'distance': comparison['distance'],
            'similarity': comparison['similarity'],
            'threshold': comparison['threshold'],
            'new_embedding': result['embedding']
        }), 200
        
    except Exception as e:
        return jsonify({
            'success': False,
            'error': f'خطأ في الخادم: {str(e)}',
            'error_code': 'SERVER_ERROR'
        }), 500


if __name__ == '__main__':
    port = int(os.getenv('PORT', 5001))
    debug = os.getenv('DEBUG', 'false').lower() == 'true'
    
    print(f"""
    ╔═══════════════════════════════════════════════════╗
    ║     Face Recognition Service (DeepFace)           ║
    ║     خدمة التعرف على الوجه                          ║
    ╠═══════════════════════════════════════════════════╣
    ║  Port: {port}                                       ║
    ║  Model: {MODEL_NAME:<20}                 ║
    ║  Detector: {DETECTOR_BACKEND:<20}              ║
    ║  Threshold: {MATCH_THRESHOLD}                                  ║
    ╚═══════════════════════════════════════════════════╝
    """)
    
    app.run(host='0.0.0.0', port=port, debug=debug)
