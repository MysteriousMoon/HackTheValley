"""
Feynman Learning Assistant - Prompt Module
费曼学习助手 - 提示词模块

Centralized management of all AI prompt templates
集中管理所有AI提示词模板
"""

from .final_analysis_prompt import PROMPT_FINAL
from .response_feedback_prompt import PROMPT_RESPOND
from .teacher_mode_prompt import PROMPT_TEACH, PROMPT_ANSWER_QUESTION

__all__ = ['PROMPT_FINAL', 'PROMPT_RESPOND', 'PROMPT_TEACH', 'PROMPT_ANSWER_QUESTION']
