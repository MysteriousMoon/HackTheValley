from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS
import json
import os
from dotenv import load_dotenv
import google.generativeai as genai
from prompts import PROMPT_FINAL, PROMPT_RESPOND

# Load environment variables 加载环境变量
load_dotenv()

GOOGLE_API_KEY = os.getenv("GOOGLE_API_KEY")

app = Flask(__name__)
CORS(app)  # Allow cross-origin requests 允许跨域请求

# Configure Google Gemini 配置 Google Gemini
genai.configure(api_key=GOOGLE_API_KEY)

# ==================== Routes 路由 ====================

# Serve static files 提供静态文件服务
@app.route('/')
def index():
    return send_from_directory('.', 'index.html')

@app.route('/<path:filename>')
def static_files(filename):
    return send_from_directory('.', filename)

# Unified AI analysis endpoint 统一的AI分析接口
@app.route('/api/analyze', methods=['POST'])
def analyze_content():
    try:
        # Get request data 获取请求数据
        data = request.get_json()
        content = data.get('content', '').strip()
        
        if not content:
            return jsonify({'error': '内容不能为空'}), 400
        
        # Call unified analysis function 调用统一的分析函数
        analysis = analyze_with_ai(content)
        
        return jsonify({
            'success': True,
            'comments': analysis
        })
        
    except Exception as e:
        import traceback
        print(f'===== AI Analysis Error AI分析错误 =====')
        print(f'Error Type 错误类型: {type(e).__name__}')
        print(f'Error Message 错误信息: {str(e)}')
        print(f'Full Stack 完整堆栈:')
        traceback.print_exc()
        
        # If exception object contains AI raw response, print it 如果异常对象包含AI原始响应，打印它
        if hasattr(e, 'ai_response'):
            print(f'===== AI Raw Output AI原始输出 =====')
            print(e.ai_response)
        
        print(f'=====================')
        return jsonify({
            'error': 'AI分析失败',
            'message': str(e)
        }), 500

# AI response endpoint AI回应接口
@app.route('/api/respond', methods=['POST'])
def respond_to_question():
    try:
        # Get request data 获取请求数据
        data = request.get_json()
        comment_id = data.get('commentId')
        response = data.get('response', '').strip()
        original_question = data.get('originalQuestion', '')  # Get original question 获取原始问题
        conversation_history = data.get('conversationHistory', [])  # Get conversation history 获取对话历史
        
        if not response:
            return jsonify({'error': '回答内容不能为空'}), 400
        
        # Call AI response function, pass in original question, user answer, and conversation history 调用AI回应函数，传入原始问题、用户回答和对话历史
        feedback_data = respond_with_ai(response, original_question, conversation_history)
        
        return jsonify({
            'success': True,
            'understood': feedback_data.get('understood', True),
            'feedback': feedback_data.get('feedback', ''),
            'followUpQuestion': feedback_data.get('followUpQuestion', None)
        })
        
    except Exception as e:
        import traceback
        print(f'===== AI Response Error AI回应错误 =====')
        print(f'Error Type 错误类型: {type(e).__name__}')
        print(f'Error Message 错误信息: {str(e)}')
        print(f'Full Stack 完整堆栈:')
        traceback.print_exc()
        
        # If exception object contains AI raw response, print it 如果异常对象包含AI原始响应，打印它
        if hasattr(e, 'ai_response'):
            print(f'===== AI Raw Output AI原始输出 =====')
            print(e.ai_response)
        
        print(f'=====================')
        return jsonify({
            'error': 'AI回应失败',
            'message': str(e)
        }), 500

# ==================== AI Functions AI 函数 ====================

def clean_json_response(text):
    """
    Clean AI response, remove markdown code block markers
    清理AI响应，移除markdown代码块标记
    
    Args:
        text: Raw text returned by AI AI返回的原始文本
    
    Returns:
        str: Cleaned JSON string 清理后的JSON字符串
    """
    text = text.strip()
    
    # Remove markdown code block markers 移除markdown代码块标记
    if text.startswith('```json'):
        text = text[7:]  # Remove opening ```json 移除开头的 ```json
    elif text.startswith('```'):
        text = text[3:]  # Remove opening ``` 移除开头的 ```
    
    if text.endswith('```'):
        text = text[:-3]  # Remove closing ``` 移除结尾的 ```
    
    # Clean all leading and trailing whitespace again (including newlines) 再次清理所有前后空白字符（包括换行符）
    text = text.strip()
    
    # Find position of first '[' or '{' (JSON start) 找到第一个 '[' 或 '{' 的位置（JSON的开始）
    json_start = -1
    for i, char in enumerate(text):
        if char in '[{':
            json_start = i
            break
    
    if json_start > 0:
        text = text[json_start:]
    
    # Find position of last ']' or '}' (JSON end) 找到最后一个 ']' 或 '}' 的位置（JSON的结束）
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
    Print AI response content
    打印AI响应内容
    
    Args:
        response_text: Raw text of AI response AI响应的原始文本
        response_type: Response type ('analysis' or 'feedback') 响应类型 ('analysis' 或 'feedback')
    """
    print(f'\n{"="*60}')
    print(f'AI响应 [{response_type.upper()}] - {__import__("datetime").datetime.now().strftime("%Y-%m-%d %H:%M:%S")}')
    print(f'{"="*60}')
    print(response_text)
    print(f'{"="*60}\n')

def analyze_with_ai(content):
    """
    Unified AI analysis function
    统一的 AI 分析函数
    
    Args:
        content: User's explanation content 用户讲解的内容
    
    Returns:
        list: List of AI-generated comments AI 生成的评论列表
    """
    ai_response = None  # For error handling access 用于错误处理时访问
    
    try:
        # Use PROMPT_FINAL template 使用 PROMPT_FINAL 模板
        prompt = PROMPT_FINAL.format(content=content)
        
        # Initialize Gemini model 初始化 Gemini 模型
        model = genai.GenerativeModel('gemini-2.0-flash')
        
        # Generate response 生成回复
        response = model.generate_content(prompt)
        ai_response = response.text
        
        # Print AI raw response 打印AI原始响应
        print_ai_response(ai_response, 'analysis')
        
        # Clean response text, remove markdown code block markers 清理响应文本，移除markdown代码块标记
        cleaned_response = clean_json_response(ai_response)
        
        # Try to parse JSON response 尝试解析JSON响应
        try:
            return json.loads(cleaned_response)
        except json.JSONDecodeError as e:
            # If AI returns incorrect format, throw error 如果AI返回格式不正确，抛出错误
            print(f'===== AI Raw Response AI原始响应 =====')
            print(ai_response)
            print(f'===== Cleaned Response 清理后的响应 =====')
            print(cleaned_response)
            print(f'===== JSON Parse Error JSON解析错误 =====')
            print(f'Error Position 错误位置: {e.pos}, Line 行: {e.lineno}, Column 列: {e.colno}')
            print(f'Error Message 错误信息: {e.msg}')
            error = ValueError(f'AI返回的响应不是有效的JSON格式: {str(e)}')
            error.ai_response = ai_response  # Attach AI response 附加AI响应
            raise error
            
    except Exception as e:
        print(f'Google Gemini API调用失败: {e}')
        if ai_response and not hasattr(e, 'ai_response'):
            e.ai_response = ai_response  # Attach AI response to exception 附加AI响应到异常
        raise

def respond_with_ai(user_response, original_question='', conversation_history=None):
    """
    Use Google Gemini to provide feedback on user's answer
    使用 Google Gemini 对用户的回答进行反馈
    
    Args:
        user_response: User's answer content 用户的回答内容
        original_question: Original question previously asked by AI AI之前提出的原始问题
        conversation_history: List of previous Q&A exchanges 之前的问答交流列表
    
    Returns:
        dict: AI feedback object, containing understood, feedback, followUpQuestion
              AI 的反馈对象，包含 understood, feedback, followUpQuestion
    """
    ai_response = None  # For error handling access 用于错误处理时访问
    
    if conversation_history is None:
        conversation_history = []
    
    # Build conversation context if there's history 如果有历史记录，构建对话上下文
    context = ""
    if conversation_history:
        context = "\n\n## Previous Conversation History 之前的对话历史:\n"
        for i, exchange in enumerate(conversation_history, 1):
            context += f"\n**Round {i} 第{i}轮:**\n"
            context += f"AI Question AI问题: {exchange.get('question', '')}\n"
            context += f"Teacher Answer 老师回答: {exchange.get('answer', '')}\n"
    
    # Build prompt with original question, user answer, and conversation history 使用原始问题、用户回答和对话历史构建提示词
    # If no original question, provide a more reasonable default value 如果没有原始问题，提供一个更合理的默认值
    prompt = PROMPT_RESPOND.format(
        previous_question=original_question if original_question else "之前讨论的概念或问题",
        teacher_answer=user_response
    )
    
    # Append conversation context to prompt 将对话上下文附加到提示词
    if context:
        prompt = prompt + context
    
    try:
        # Initialize Gemini model 初始化 Gemini 模型
        model = genai.GenerativeModel('gemini-2.0-flash')
        
        # Generate response 生成回复
        response = model.generate_content(prompt)
        ai_response = response.text.strip()
        
        # Print AI feedback response 打印AI反馈响应
        print_ai_response(ai_response, 'feedback')
        
        # Clean and parse JSON response 清理和解析JSON响应
        cleaned_response = clean_json_response(ai_response)
        
        try:
            feedback_data = json.loads(cleaned_response)
            
            # Validate required fields 验证必需字段
            if 'understood' not in feedback_data or 'feedback' not in feedback_data:
                raise ValueError('AI返回的反馈缺少必需字段')
            
            return feedback_data
            
        except json.JSONDecodeError as e:
            # If JSON parsing fails, return text format fallback 如果JSON解析失败，返回文本格式的兜底方案
            print(f'===== AI Feedback JSON Parse Failed AI反馈JSON解析失败 =====')
            print(f'Raw Response 原始响应: {ai_response}')
            print(f'Cleaned 清理后: {cleaned_response}')
            print(f'Error 错误: {str(e)}')
            print(f'===== Using Fallback 使用兜底方案 =====')
            
            # Fallback: assume fully understood, return text content 兜底方案：假设完全理解，返回文本内容
            return {
                'understood': True,
                'feedback': ai_response,
                'followUpQuestion': None
            }
            
    except Exception as e:
        print(f'Google Gemini API调用失败: {e}')
        if ai_response and not hasattr(e, 'ai_response'):
            e.ai_response = ai_response  # Attach AI response to exception 附加AI响应到异常
        raise

# ==================== Start Service 启动服务 ====================

if __name__ == '__main__':
    port = int(os.getenv('PORT', 10001))
    debug_mode = os.getenv('FLASK_ENV') == 'development'
    
    print(f'🚀 费曼学习助手运行在 http://localhost:{port}')
    app.run(host='127.0.0.1', port=port, debug=debug_mode)