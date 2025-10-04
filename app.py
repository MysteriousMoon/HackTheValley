from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS
import json
import os
from dotenv import load_dotenv
import google.generativeai as genai
from prompts import PROMPT_FINAL, PROMPT_RESPOND

# 加载环境变量
load_dotenv()

GOOGLE_API_KEY = os.getenv("GOOGLE_API_KEY")

app = Flask(__name__)
CORS(app)  # 允许跨域请求

# 配置 Google Gemini
genai.configure(api_key=GOOGLE_API_KEY)

# ==================== 路由 ====================

# 提供静态文件服务
@app.route('/')
def index():
    return send_from_directory('.', 'index.html')

@app.route('/<path:filename>')
def static_files(filename):
    return send_from_directory('.', filename)

# 统一的AI分析接口
@app.route('/api/analyze', methods=['POST'])
def analyze_content():
    try:
        # 获取请求数据
        data = request.get_json()
        content = data.get('content', '').strip()
        is_segment = data.get('isSegment', False)
        is_final = data.get('isFinal', False)
        
        if not content:
            return jsonify({'error': '内容不能为空'}), 400
        
        # 智能跟进和手动发送都使用 'final' 类型（使用 PROMPT_FINAL）
        # 因为 PROMPT_FINAL 的 JSON 格式更稳定可靠
        analysis_type = 'final'
        
        # 调用统一的分析函数
        analysis = analyze_with_ai(content, analysis_type)
        
        return jsonify({
            'success': True,
            'comments': analysis
        })
        
    except Exception as e:
        import traceback
        print(f'===== AI分析错误 =====')
        print(f'错误类型: {type(e).__name__}')
        print(f'错误信息: {str(e)}')
        print(f'完整堆栈:')
        traceback.print_exc()
        print(f'=====================')
        return jsonify({
            'error': 'AI分析失败',
            'message': str(e)
        }), 500

# AI回应接口
@app.route('/api/respond', methods=['POST'])
def respond_to_question():
    try:
        # 获取请求数据
        data = request.get_json()
        comment_id = data.get('commentId')
        response = data.get('response', '').strip()
        original_question = data.get('originalQuestion', '')  # 获取原始问题
        
        if not response:
            return jsonify({'error': '回答内容不能为空'}), 400
        
        # 调用AI回应函数，返回结构化数据
        feedback_data = respond_with_ai(response)
        
        return jsonify({
            'success': True,
            'understood': feedback_data.get('understood', True),
            'feedback': feedback_data.get('feedback', ''),
            'followUpQuestion': feedback_data.get('followUpQuestion', None)
        })
        
    except Exception as e:
        print(f'AI回应错误: {e}')
        return jsonify({
            'error': 'AI回应失败',
            'message': str(e)
        }), 500

# ==================== AI 函数 ====================

def clean_json_response(text):
    """
    清理AI响应，移除markdown代码块标记
    
    Args:
        text: AI返回的原始文本
    
    Returns:
        str: 清理后的JSON字符串
    """
    text = text.strip()
    
    # 移除markdown代码块标记
    if text.startswith('```json'):
        text = text[7:]  # 移除开头的 ```json
    elif text.startswith('```'):
        text = text[3:]  # 移除开头的 ```
    
    if text.endswith('```'):
        text = text[:-3]  # 移除结尾的 ```
    
    # 再次清理所有前后空白字符（包括换行符）
    text = text.strip()
    
    # 找到第一个 '[' 或 '{' 的位置（JSON的开始）
    json_start = -1
    for i, char in enumerate(text):
        if char in '[{':
            json_start = i
            break
    
    if json_start > 0:
        text = text[json_start:]
    
    # 找到最后一个 ']' 或 '}' 的位置（JSON的结束）
    json_end = -1
    for i in range(len(text) - 1, -1, -1):
        if text[i] in ']}':
            json_end = i + 1
            break
    
    if json_end > 0:
        text = text[:json_end]
    
    return text.strip()

def print_ai_response(response_text, response_type='analysis'):
    """
    打印AI响应内容
    
    Args:
        response_text: AI响应的原始文本
        response_type: 响应类型 ('analysis' 或 'feedback')
    """
    print(f'\n{"="*60}')
    print(f'AI响应 [{response_type.upper()}] - {__import__("datetime").datetime.now().strftime("%Y-%m-%d %H:%M:%S")}')
    print(f'{"="*60}')
    print(response_text)
    print(f'{"="*60}\n')

def analyze_with_ai(content, analysis_type='final'):
    """
    统一的 AI 分析函数
    
    Args:
        content: 用户讲解的内容
        analysis_type: 分析类型（目前统一使用 'final'）
    
    Returns:
        list: AI 生成的评论列表
    """
    # 使用 PROMPT_FINAL 模板
    prompt = PROMPT_FINAL.format(content=content)
    
    try:
        # 初始化 Gemini 模型
        model = genai.GenerativeModel('gemini-2.0-flash')
        
        # 生成回复
        response = model.generate_content(prompt)
        ai_response = response.text
        
        # 打印AI原始响应
        print_ai_response(ai_response, 'analysis')
        
        # 清理响应文本，移除markdown代码块标记
        cleaned_response = clean_json_response(ai_response)
        
        # 尝试解析JSON响应
        try:
            return json.loads(cleaned_response)
        except json.JSONDecodeError as e:
            # 如果AI返回格式不正确，抛出错误
            print(f'===== AI原始响应 =====')
            print(ai_response)
            print(f'===== 清理后的响应 =====')
            print(cleaned_response)
            print(f'===== JSON解析错误 =====')
            print(f'错误位置: {e.pos}, 行: {e.lineno}, 列: {e.colno}')
            print(f'错误信息: {e.msg}')
            raise ValueError(f'AI返回的响应不是有效的JSON格式: {str(e)}')
            
    except Exception as e:
        print(f'Google Gemini API调用失败: {e}')
        raise

def respond_with_ai(user_response):
    """
    使用 Google Gemini 对用户的回答进行反馈
    
    Args:
        user_response: 用户的回答内容
    
    Returns:
        dict: AI 的反馈对象，包含 understood, feedback, followUpQuestion
    """
    prompt = PROMPT_RESPOND.format(response=user_response)
    
    try:
        # 初始化 Gemini 模型
        model = genai.GenerativeModel('gemini-2.0-flash')
        
        # 生成回复
        response = model.generate_content(prompt)
        ai_response = response.text.strip()
        
        # 打印AI反馈响应
        print_ai_response(ai_response, 'feedback')
        
        # 清理和解析JSON响应
        cleaned_response = clean_json_response(ai_response)
        
        try:
            feedback_data = json.loads(cleaned_response)
            
            # 验证必需字段
            if 'understood' not in feedback_data or 'feedback' not in feedback_data:
                raise ValueError('AI返回的反馈缺少必需字段')
            
            return feedback_data
            
        except json.JSONDecodeError as e:
            # 如果JSON解析失败，返回文本格式的兜底方案
            print(f'===== AI反馈JSON解析失败 =====')
            print(f'原始响应: {ai_response}')
            print(f'清理后: {cleaned_response}')
            print(f'错误: {str(e)}')
            print(f'===== 使用兜底方案 =====')
            
            # 兜底方案：假设完全理解，返回文本内容
            return {
                'understood': True,
                'feedback': ai_response,
                'followUpQuestion': None
            }
            
    except Exception as e:
        print(f'Google Gemini API调用失败: {e}')
        raise

# ==================== 启动服务 ====================

if __name__ == '__main__':
    port = int(os.getenv('PORT', 10001))
    debug_mode = os.getenv('FLASK_ENV') == 'development'
    
    print(f'🚀 费曼学习助手运行在 http://localhost:{port}')
    app.run(host='127.0.0.1', port=port, debug=debug_mode)