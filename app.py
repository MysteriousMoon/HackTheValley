from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS
import json
import os
from dotenv import load_dotenv
import google.generativeai as genai

# 加载环境变量
load_dotenv()

GOOGLE_API_KEY = os.getenv("GOOGLE_API_KEY")

app = Flask(__name__)
CORS(app)  # 允许跨域请求

# 配置 Google Gemini
genai.configure(api_key=GOOGLE_API_KEY)

# ==================== 提示词模板 ====================

PROMPT_FINAL = """
你是一个认真学习的学生。老师刚刚完成了一次完整的知识讲解。

完整的讲解内容是：
"{content}"

现在请作为学生，对整个讲解进行综合性的深度分析，提出2-4个重要问题，重点关注：
1. 整体逻辑结构是否完整
2. 关键概念是否需要进一步澄清
3. 是否缺少重要的例子或应用
4. 知识点之间的关联性
5. 需要深度讨论的核心问题

以JSON格式返回，格式如下：
[
  {{
    "id": "final1",
    "type": "question",
    "title": "核心概念确认",
    "content": "具体的深度问题",
    "needsResponse": true
  }},
  {{
    "id": "final2", 
    "type": "clarification",
    "title": "逻辑连接",
    "content": "需要澄清的逻辑关系",
    "needsResponse": false
  }}
]

注意：
- 这是最终分析，可以提出需要详细回答的深度问题(needsResponse: true)
- 关注整体性和深度，而不是细节
- type可以是: question(疑问), concern(担忧), clarification(澄清), praise(好评)
"""

PROMPT_RESPOND = """
作为一个学生，我刚刚听了老师对我问题的回答：

"{response}"

请按照以下结构给出反馈，让回复更加真实和有教育意义：

1. 首先用一句话概括老师的解答要点（表明你理解了核心内容）
2. 真诚地感谢老师的耐心讲解
3. 如果还有不太明白的地方，具体指出哪个点需要进一步澄清

回复格式参考：
"好的，我明白了，老师您的意思是[用一句话概括老师的解答]。谢谢老师这么耐心跟我解释，不过我还是有点不太明白[具体哪个点不太明白]。"

注意：
- 如果完全理解了，可以省略第3部分，表达感谢和收获即可
- 如果还有疑问，要具体说明是哪个概念、哪个步骤或哪个逻辑关系不清楚
- 语言要自然、礼貌，符合学生的口吻
- 保持简洁，一般2-3句话即可
"""

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
        print(f'AI分析错误: {e}')
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
        
        if not response:
            return jsonify({'error': '回答内容不能为空'}), 400
        
        # 调用AI回应函数
        feedback = respond_with_ai(response)
        
        return jsonify({
            'success': True,
            'content': feedback
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
    
    return text.strip()

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
        
        # 清理响应文本，移除markdown代码块标记
        cleaned_response = clean_json_response(ai_response)
        
        # 尝试解析JSON响应
        try:
            return json.loads(cleaned_response)
        except json.JSONDecodeError as e:
            # 如果AI返回格式不正确，抛出错误
            print(f'AI返回的JSON格式不正确: {ai_response}')
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
        str: AI 的反馈文本
    """
    prompt = PROMPT_RESPOND.format(response=user_response)
    
    try:
        # 初始化 Gemini 模型
        model = genai.GenerativeModel('gemini-2.0-flash')
        
        # 生成回复
        response = model.generate_content(prompt)
        
        return response.text.strip()
            
    except Exception as e:
        print(f'Google Gemini API调用失败: {e}')
        raise

# ==================== 启动服务 ====================

if __name__ == '__main__':
    port = int(os.getenv('PORT', 10001))
    debug_mode = os.getenv('FLASK_ENV') == 'development'
    
    print(f'🚀 费曼学习助手运行在 http://localhost:{port}')
    app.run(host='127.0.0.1', port=port, debug=debug_mode)