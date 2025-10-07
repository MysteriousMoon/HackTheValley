from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS
import json
import os
from dotenv import load_dotenv
import google.generativeai as genai
from prompts import PROMPT_FINAL, PROMPT_RESPOND, PROMPT_TEACH, PROMPT_ANSWER_QUESTION

# Load environment variables 加载环境变量
load_dotenv()

GOOGLE_API_KEY = os.getenv("GOOGLE_API_KEY")
generation_config = {
  "temperature": 0.4
}

app = Flask(__name__)
CORS(app)  # Allow cross-origin requests 允许跨域请求

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
        custom_api_key = data.get('apiKey', '').strip()  # Get custom API key 获取自定义API密钥
        
        if not content:
            return jsonify({'error': '内容不能为空'}), 400
        
        # Call unified analysis function with custom API key 使用自定义API密钥调用统一的分析函数
        analysis = analyze_with_ai(content, custom_api_key)
        
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
        custom_api_key = data.get('apiKey', '').strip()  # Get custom API key 获取自定义API密钥
        
        if not response:
            return jsonify({'error': '回答内容不能为空'}), 400
        
        # Call AI response function with custom API key 使用自定义API密钥调用AI回应函数
        feedback_data = respond_with_ai(response, original_question, conversation_history, custom_api_key)
        
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

# Teacher mode: Start teaching 教师模式：开始教学
@app.route('/api/teach', methods=['POST'])
def start_teaching():
    try:
        # Get request data 获取请求数据
        data = request.get_json()
        topic = data.get('topic', '').strip()
        custom_api_key = data.get('apiKey', '').strip()  # Get custom API key 获取自定义API密钥
        
        if not topic:
            return jsonify({'error': '教学主题不能为空'}), 400
        
        # Call AI teaching function 调用AI教学函数
        teaching_content = teach_with_ai(topic, custom_api_key)
        
        return jsonify({
            'success': True,
            'content': teaching_content,
            'topic': topic
        })
        
    except Exception as e:
        import traceback
        print(f'===== AI Teaching Error AI教学错误 =====')
        print(f'Error Type 错误类型: {type(e).__name__}')
        print(f'Error Message 错误信息: {str(e)}')
        print(f'Full Stack 完整堆栈:')
        traceback.print_exc()
        
        if hasattr(e, 'ai_response'):
            print(f'===== AI Raw Output AI原始输出 =====')
            print(e.ai_response)
        
        print(f'=====================')
        return jsonify({
            'error': 'AI教学失败',
            'message': str(e)
        }), 500

# Teacher mode: Start teaching with image 教师模式：带图片的教学
@app.route('/api/teach-with-image', methods=['POST'])
def start_teaching_with_image():
    try:
        # Get request data 获取请求数据
        data = request.get_json()
        
        print(f'===== Received Image Upload Request =====')
        print(f'Keys in data: {list(data.keys()) if data else "None"}')
        
        topic = data.get('topic', '').strip()
        image = data.get('image')  # {'data': base64, 'mimeType': '...', 'name': '...'}
        custom_api_key = data.get('apiKey', '').strip()
        
        print(f'Topic: {topic if topic else "(empty)"}')
        print(f'Image present: {image is not None}')
        if image:
            print(f'Image keys: {list(image.keys())}')
            print(f'Image mimeType: {image.get("mimeType")}')
            print(f'Image data length: {len(image.get("data", "")) if image.get("data") else 0} chars')
        print(f'Custom API key: {"Yes" if custom_api_key else "No"}')
        print(f'======================================')
        
        if not image:
            return jsonify({'error': '图片不能为空'}), 400
        
        if not image.get('data'):
            return jsonify({'error': '图片数据为空'}), 400
        
        # Call AI teaching function with image 调用带图片的AI教学函数
        teaching_content = teach_with_ai_image(topic, image, custom_api_key)
        
        return jsonify({
            'success': True,
            'content': teaching_content,
            'topic': topic or 'Image Analysis'
        })
        
    except Exception as e:
        import traceback
        print(f'===== AI Image Teaching Error AI图片教学错误 =====')
        print(f'Error Type 错误类型: {type(e).__name__}')
        print(f'Error Message 错误信息: {str(e)}')
        print(f'Full Stack 完整堆栈:')
        traceback.print_exc()
        
        if hasattr(e, 'ai_response'):
            print(f'===== AI Raw Output AI原始输出 =====')
            print(e.ai_response)
        
        print(f'=====================')
        return jsonify({
            'error': 'AI图片教学失败',
            'message': str(e)
        }), 500

# Teacher mode: Answer student question 教师模式：回答学生问题
@app.route('/api/answer', methods=['POST'])
def answer_student_question():
    try:
        # Get request data 获取请求数据
        data = request.get_json()
        topic = data.get('topic', '').strip()
        question = data.get('question', '').strip()
        teaching_context = data.get('teachingContext', '')
        conversation_history = data.get('conversationHistory', [])
        custom_api_key = data.get('apiKey', '').strip()
        
        if not question:
            return jsonify({'error': '问题不能为空'}), 400
        
        if not topic:
            return jsonify({'error': '教学主题不能为空'}), 400
        
        # Call AI answer function 调用AI回答函数
        answer_data = answer_question_with_ai(topic, question, teaching_context, conversation_history, custom_api_key)
        
        return jsonify({
            'success': True,
            'answer': answer_data.get('answer', ''),
            'additionalContext': answer_data.get('additionalContext', ''),
            'encouragement': answer_data.get('encouragement', '')
        })
        
    except Exception as e:
        import traceback
        print(f'===== AI Answer Error AI回答错误 =====')
        print(f'Error Type 错误类型: {type(e).__name__}')
        print(f'Error Message 错误信息: {str(e)}')
        print(f'Full Stack 完整堆栈:')
        traceback.print_exc()
        
        if hasattr(e, 'ai_response'):
            print(f'===== AI Raw Output AI原始输出 =====')
            print(e.ai_response)
        
        print(f'=====================')
        return jsonify({
            'error': 'AI回答失败',
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

def get_api_key(custom_api_key=''):
    """
    Get API key to use: custom key if provided, otherwise default
    获取要使用的API密钥：如果提供了自定义密钥则使用，否则使用默认密钥
    
    Args:
        custom_api_key: Custom API key from user 用户提供的自定义API密钥
    
    Returns:
        str: API key to use 要使用的API密钥
    """
    if custom_api_key:
        print(f'Using custom API key (ending with: ...{custom_api_key[-4:]})')
        return custom_api_key
    else:
        print('Using default API key from environment')
        return GOOGLE_API_KEY

def analyze_with_ai(content, custom_api_key=''):
    """
    Unified AI analysis function
    统一的 AI 分析函数
    
    Args:
        content: User's explanation content 用户讲解的内容
        custom_api_key: Custom API key 自定义API密钥
    
    Returns:
        list: List of AI-generated comments AI 生成的评论列表
    """
    ai_response = None  # For error handling access 用于错误处理时访问
    
    try:
        # Get API key to use 获取要使用的API密钥
        api_key = get_api_key(custom_api_key)
        
        # Configure Gemini with the selected API key 使用选定的API密钥配置Gemini
        genai.configure(api_key=api_key)
        
        # Use PROMPT_FINAL template 使用 PROMPT_FINAL 模板
        prompt = PROMPT_FINAL.format(content=content)
        
        # Initialize Gemini model 初始化 Gemini 模型
        model = genai.GenerativeModel('gemini-2.0-flash')
        
        # Generate response 生成回复
        response = model.generate_content(
            prompt,
            generation_config=generation_config
        )
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

def respond_with_ai(user_response, original_question='', conversation_history=None, custom_api_key=''):
    """
    Use Google Gemini to provide feedback on user's answer
    使用 Google Gemini 对用户的回答进行反馈
    
    Args:
        user_response: User's answer content 用户的回答内容
        original_question: Original question previously asked by AI AI之前提出的原始问题
        conversation_history: List of previous Q&A exchanges 之前的问答交流列表
        custom_api_key: Custom API key 自定义API密钥
    
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
        # Get API key to use 获取要使用的API密钥
        api_key = get_api_key(custom_api_key)
        
        # Configure Gemini with the selected API key 使用选定的API密钥配置Gemini
        genai.configure(api_key=api_key)
        
        # Initialize Gemini model 初始化 Gemini 模型
        model = genai.GenerativeModel('gemini-2.0-flash')
        
        # Generate response 生成回复
        response = model.generate_content(
            prompt,
            generation_config=generation_config
        )
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

def teach_with_ai(topic, custom_api_key=''):
    """
    Use Google Gemini to teach a topic
    使用 Google Gemini 教授一个主题
    
    Args:
        topic: Topic to teach 要教授的主题
        custom_api_key: Custom API key 自定义API密钥
    
    Returns:
        str: Teaching content 教学内容
    """
    ai_response = None
    
    try:
        # Get API key to use 获取要使用的API密钥
        api_key = get_api_key(custom_api_key)
        
        # Configure Gemini with the selected API key 使用选定的API密钥配置Gemini
        genai.configure(api_key=api_key)
        
        # Use PROMPT_TEACH template 使用 PROMPT_TEACH 模板
        prompt = PROMPT_TEACH.format(topic=topic)
        
        # Initialize Gemini model 初始化 Gemini 模型
        model = genai.GenerativeModel('gemini-2.0-flash')
        
        # Generate response 生成回复
        response = model.generate_content(
            prompt,
            generation_config=generation_config
        )
        ai_response = response.text.strip()
        
        # Print AI teaching response 打印AI教学响应
        print_ai_response(ai_response, 'teaching')
        
        return ai_response
            
    except Exception as e:
        print(f'Google Gemini API调用失败: {e}')
        if ai_response and not hasattr(e, 'ai_response'):
            e.ai_response = ai_response
        raise

def teach_with_ai_image(topic, image, custom_api_key=''):
    """
    Use Google Gemini to teach based on an image
    使用 Google Gemini 基于图片进行教学
    
    Args:
        topic: Topic or question about the image 关于图片的主题或问题
        image: Image data dict {'data': base64, 'mimeType': '...'} 图片数据
        custom_api_key: Custom API key 自定义API密钥
    
    Returns:
        str: Teaching content 教学内容
    """
    ai_response = None
    
    try:
        # Get API key to use 获取要使用的API密钥
        api_key = get_api_key(custom_api_key)
        
        # Configure Gemini with the selected API key 使用选定的API密钥配置Gemini
        genai.configure(api_key=api_key)
        
        # Build prompt 构建提示词
        prompt_text = f"""You are an experienced and patient teacher. The student has uploaded an image and wants to learn about it.

Student's request: {topic}

Please analyze the image and provide a comprehensive explanation. Your explanation should:
1. Describe what you see in the image
2. Explain the key concepts or principles shown
3. Provide relevant context and background information
4. Use clear and simple language
5. Make connections to real-world applications if applicable

Provide your teaching content as plain text (NOT JSON). Write naturally and engagingly."""
        
        # Initialize Gemini model 初始化 Gemini 模型
        model = genai.GenerativeModel('gemini-2.0-flash')
        
        # Build multimodal input 构建多模态输入
        content_parts = [
            prompt_text,
            {
                'mime_type': image['mimeType'],
                'data': image['data']
            }
        ]
        
        # Generate response 生成回复
        response = model.generate_content(
            content_parts,
            generation_config=generation_config
        )
        ai_response = response.text.strip()
        
        # Print AI teaching response 打印AI教学响应
        print_ai_response(ai_response, 'image_teaching')
        
        return ai_response
            
    except Exception as e:
        print(f'Google Gemini API调用失败: {e}')
        if ai_response and not hasattr(e, 'ai_response'):
            e.ai_response = ai_response
        raise

def answer_question_with_ai(topic, question, teaching_context='', conversation_history=None, custom_api_key=''):
    """
    Use Google Gemini to answer student's question
    使用 Google Gemini 回答学生的问题
    
    Args:
        topic: Current teaching topic 当前教学主题
        question: Student's question 学生的问题
        teaching_context: Previous teaching content 之前的教学内容
        conversation_history: Previous Q&A history 之前的问答历史
        custom_api_key: Custom API key 自定义API密钥
    
    Returns:
        dict: Answer data containing answer, additionalContext, encouragement
              答案数据，包含 answer, additionalContext, encouragement
    """
    ai_response = None
    
    if conversation_history is None:
        conversation_history = []
    
    # Build conversation context 构建对话上下文
    context = ""
    if conversation_history:
        context = "\n\n## Previous Q&A History 之前的问答历史:\n"
        for i, exchange in enumerate(conversation_history, 1):
            context += f"\n**Q&A {i} 问答{i}:**\n"
            context += f"Question 问题: {exchange.get('question', '')}\n"
            context += f"Answer 回答: {exchange.get('answer', '')}\n"
    
    # Build prompt 构建提示词
    prompt = PROMPT_ANSWER_QUESTION.format(
        topic=topic,
        question=question,
        teaching_context=teaching_context if teaching_context else "Initial teaching session 初始教学",
        conversation_history=context if context else "No previous Q&A 没有之前的问答"
    )
    
    try:
        # Get API key to use 获取要使用的API密钥
        api_key = get_api_key(custom_api_key)
        
        # Configure Gemini with the selected API key 使用选定的API密钥配置Gemini
        genai.configure(api_key=api_key)
        
        # Initialize Gemini model 初始化 Gemini 模型
        model = genai.GenerativeModel('gemini-2.0-flash')
        
        # Generate response 生成回复
        response = model.generate_content(
            prompt,
            generation_config=generation_config
        )
        ai_response = response.text.strip()
        
        # Print AI answer response 打印AI回答响应
        print_ai_response(ai_response, 'answer')
        
        # Clean and parse JSON response 清理和解析JSON响应
        cleaned_response = clean_json_response(ai_response)
        
        try:
            answer_data = json.loads(cleaned_response)
            
            # Validate required fields 验证必需字段
            if 'answer' not in answer_data:
                raise ValueError('AI返回的答案缺少必需字段')
            
            # Set defaults for optional fields 为可选字段设置默认值
            if 'additionalContext' not in answer_data:
                answer_data['additionalContext'] = ''
            if 'encouragement' not in answer_data:
                answer_data['encouragement'] = 'Feel free to ask more questions! 随时提出更多问题！'
            
            return answer_data
            
        except json.JSONDecodeError as e:
            # If JSON parsing fails, return text format fallback 如果JSON解析失败，返回文本格式的兜底方案
            print(f'===== AI Answer JSON Parse Failed AI答案JSON解析失败 =====')
            print(f'Raw Response 原始响应: {ai_response}')
            print(f'Cleaned 清理后: {cleaned_response}')
            print(f'Error 错误: {str(e)}')
            print(f'===== Using Fallback 使用兜底方案 =====')
            
            # Fallback: return text content 兜底方案：返回文本内容
            return {
                'answer': ai_response,
                'additionalContext': '',
                'encouragement': 'Feel free to ask more questions! 随时提出更多问题！'
            }
            
    except Exception as e:
        print(f'Google Gemini API调用失败: {e}')
        if ai_response and not hasattr(e, 'ai_response'):
            e.ai_response = ai_response
        raise

# ==================== Start Service 启动服务 ====================

if __name__ == '__main__':
    port = int(os.getenv('PORT', 10001))
    debug_mode = os.getenv('FLASK_ENV') == 'development'
    
    print(f'运行在 http://localhost:{port}')
    app.run(host='127.0.0.1', port=port, debug=debug_mode)
