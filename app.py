from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS
import json
import os
from dotenv import load_dotenv
import google.generativeai as genai  # 替换 openai 导入

GOOGLE_API_KEY = os.getenv("GOOGLE_API_KEY")

# 加载环境变量
load_dotenv()

app = Flask(__name__)
CORS(app)  # 允许跨域请求

# 配置 Google Gemini
genai.configure(api_key=GOOGLE_API_KEY)  # 使用 Google API key

# 提供静态文件服务
@app.route('/')
def index():
    return send_from_directory('.', 'index.html')

@app.route('/<path:filename>')
def static_files(filename):
    return send_from_directory('.', filename)

# AI分析接口
@app.route('/api/analyze', methods=['POST'])
def analyze_content():
    try:
        # 获取请求数据
        data = request.get_json()
        content = data.get('content', '').strip()
        
        if not content:
            return jsonify({'error': '内容不能为空'}), 400
        
        # 调用AI分析函数
        analysis = analyze_with_ai(content)
        
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

# 分段分析接口
@app.route('/api/analyze-segment', methods=['POST'])
def analyze_segment():
    try:
        data = request.get_json()
        segment = data.get('segment', '').strip()
        context = data.get('context', [])
        
        if not segment:
            return jsonify({'error': '分段内容不能为空'}), 400
        
        # 调用分段分析函数
        analysis = analyze_segment_with_ai(segment, context)
        
        return jsonify({
            'success': True,
            'comments': analysis
        })
        
    except Exception as e:
        print(f'分段分析错误: {e}')
        return jsonify({
            'error': '分段分析失败',
            'message': str(e)
        }), 500

# 最终分析接口
@app.route('/api/analyze-final', methods=['POST'])
def analyze_final():
    try:
        data = request.get_json()
        full_content = data.get('fullContent', '').strip()
        segments = data.get('segments', [])
        
        if not full_content:
            return jsonify({'error': '内容不能为空'}), 400
        
        # 调用最终分析函数
        analysis = analyze_final_with_ai(full_content, segments)
        
        return jsonify({
            'success': True,
            'comments': analysis
        })
        
    except Exception as e:
        print(f'最终分析错误: {e}')
        return jsonify({
            'error': '最终分析失败',
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

def analyze_with_ai(content):
    """
    使用 Google Gemini Pro 分析用户讲解内容
    """
    prompt = f"""
你是一个认真学习的学生。请分析老师的这段讲解：

"{content}"

请以学生的角度提出2-4个问题或批注，帮助发现讲解中的：
1. 不清楚的概念
2. 逻辑跳跃
3. 缺少例子的地方
4. 需要更详细解释的部分

对于重要的疑问，标记为需要老师回应(needsResponse: true)。

以JSON格式返回，格式如下：
[
  {{
    "id": "q1",
    "type": "question",
    "title": "概念疑问", 
    "content": "具体的问题内容",
    "needsResponse": true
  }},
  {{
    "id": "q2",
    "type": "clarification", 
    "title": "需要澄清",
    "content": "需要澄清的内容",
    "needsResponse": false
  }}
]

type可以是: question(疑问), concern(担忧), clarification(澄清), praise(好评)
needsResponse: 如果是重要问题需要老师详细回答则为true，一般性评论为false
"""

    try:
        # 初始化 Gemini Pro 模型
        model = genai.GenerativeModel('gemini-2.5-flash')
        
        # 生成回复
        response = model.generate_content(prompt)
        
        # 获取文本响应
        ai_response = response.text
        
        # 尝试解析JSON响应
        try:
            return json.loads(ai_response)
        except json.JSONDecodeError:
            # 如果AI返回格式不正确，提供默认响应
            return [
                {
                    "id": "q1",
                    "type": "question",
                    "title": "理解确认",
                    "content": "我对你刚才的讲解有些疑问，能否再详细解释一下？",
                    "needsResponse": True
                }
            ]
            
    except Exception as e:
        print(f'Google Gemini API调用失败: {e}')
        # 返回默认批注
        return [
            {
                "id": "error",
                "type": "concern",
                "title": "系统提示",
                "content": "AI分析服务暂时不可用，请稍后重试。",
                "needsResponse": False
            }
        ]

def respond_with_ai(user_response):
    """
    使用 Google Gemini Pro 对用户的回答进行反馈
    """
    prompt = f"""
作为一个学生，我刚刚听了老师对我问题的回答：

"{user_response}"

请给出简短的反馈，表达：
1. 对解答的理解程度
2. 是否还有疑问
3. 感谢老师的耐心解释

用简洁、自然的语言回复，就像真实学生会说的话。
"""

    try:
        # 初始化 Gemini 2.5 Flash 模型
        model = genai.GenerativeModel('gemini-2.5-flash')

        # 生成回复
        response = model.generate_content(prompt)
        
        # 获取文本响应
        return response.text.strip()
            
    except Exception as e:
        print(f'Google Gemini API调用失败: {e}')
        # 返回默认反馈
        return "谢谢老师的解释！我明白了很多。"

def analyze_segment_with_ai(segment, context):
    """
    分段分析用户讲解内容
    """
    context_summary = ""
    if context:
        context_summary = f"之前已经讲解了{len(context)}个部分，主要涉及的话题有："
        for i, seg in enumerate(context[-3:]):  # 只保留最近3段的上下文
            context_summary += f"\n{i+1}. {seg['content'][:50]}..."
    
    prompt = f"""
你是一个认真学习的学生。老师正在分段讲解知识点。

{context_summary}

现在老师讲解了这一段：
"{segment}"

作为学生，请对这一段内容提出1-2个简短的实时反馈，重点关注：
1. 这段内容是否清楚易懂
2. 是否需要举例说明
3. 与前面内容的逻辑连接
4. 简短的鼓励或疑问

以JSON格式返回，格式如下：
[
  {{
    "id": "seg1",
    "type": "question",
    "title": "实时疑问",
    "content": "具体的问题内容",
    "needsResponse": false
  }}
]

注意：
- 分段分析主要是实时反馈，needsResponse通常为false
- 评论要简短，符合实时跟进的特点
- type可以是: question(疑问), clarification(澄清), praise(好评), concern(担忧)
"""

    try:
        model = genai.GenerativeModel('gemini-2.5-flash')
        response = model.generate_content(prompt)
        ai_response = response.text
        
        try:
            return json.loads(ai_response)
        except json.JSONDecodeError:
            return [
                {
                    "id": "seg_default",
                    "type": "praise",
                    "title": "继续讲解",
                    "content": "这部分讲得不错，请继续！",
                    "needsResponse": False
                }
            ]
            
    except Exception as e:
        print(f'分段分析API调用失败: {e}')
        return [
            {
                "id": "seg_error",
                "type": "concern",
                "title": "系统提示",
                "content": "实时分析暂时不可用，继续讲解即可。",
                "needsResponse": False
            }
        ]

def analyze_final_with_ai(full_content, segments):
    """
    最终综合分析
    """
    segment_summary = ""
    if segments:
        segment_summary = f"在讲解过程中，我已经对{len(segments)}个部分进行了实时反馈。"
    
    prompt = f"""
你是一个认真学习的学生。老师刚刚完成了一次完整的知识讲解。

{segment_summary}

完整的讲解内容是：
"{full_content}"

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

    try:
        model = genai.GenerativeModel('gemini-2.5-flash')
        response = model.generate_content(prompt)
        ai_response = response.text
        
        try:
            return json.loads(ai_response)
        except json.JSONDecodeError:
            return [
                {
                    "id": "final_default",
                    "type": "question",
                    "title": "整体理解确认",
                    "content": "总的来说讲解很好，能否总结一下核心要点？",
                    "needsResponse": True
                }
            ]
            
    except Exception as e:
        print(f'最终分析API调用失败: {e}')
        return [
            {
                "id": "final_error",
                "type": "praise",
                "title": "讲解完成",
                "content": "感谢您的详细讲解！",
                "needsResponse": False
            }
        ]

if __name__ == '__main__':
    port = int(os.getenv('PORT', 5000))
    debug_mode = os.getenv('FLASK_ENV') == 'development'
    
    print(f'🚀 费曼学习助手运行在 http://localhost:{port}')
    app.run(host='0.0.0.0', port=port, debug=debug_mode)