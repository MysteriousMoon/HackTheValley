# 提示词模块

这个目录包含了费曼学习助手使用的所有AI提示词模板。

## 文件说明

### `__init__.py`
模块初始化文件，导出所有提示词模板供主程序使用。

### `final_analysis_prompt.py`
包含 `PROMPT_FINAL` 提示词，用于分析完整的讲解内容并生成结构化的反馈问题。

**主要功能：**
- 基于"三层理解检测法"分析讲解质量
- 识别概念清晰度、逻辑连贯性和应用场景问题
- 返回JSON格式的结构化反馈

### `response_feedback_prompt.py`
包含 `PROMPT_RESPOND` 提示词，用于对用户的回答进行费曼式反馈。

**主要功能：**
- 基于费曼学习法进行反馈
- 用自己的话复述老师的解答
- 诚实评估理解状态并精准定位困惑点

## 使用方法

在主程序中导入提示词：

```python
from prompts import PROMPT_FINAL, PROMPT_RESPOND

# 使用提示词
prompt = PROMPT_FINAL.format(content="讲解内容")
response_prompt = PROMPT_RESPOND.format(response="老师的回答")
```

## 修改提示词

如需修改提示词内容，请直接编辑对应的 `.py` 文件。修改后无需重启服务，新的请求会自动使用更新后的提示词。
