"""
ML 服务高级混淆测试脚本
用于测试模型的抗干扰能力和特征提取稳健性
"""

import requests

URL = "http://localhost:8000/predict"

# 极具迷惑性的测试集
tricky_test_cases = [
    # 1. 情绪化技术硬核 (极易被误判为闲聊/垃圾)
    "卧槽这Webpack打包速度慢得像便秘一样，我特么加了HappyPack和TerserPlugin还是卡在构建AST那一步，这破玩意儿到底怎么优化啊，气死老子了！",
    
    # 2. 伪装成技术交流的软广 (极易被漏判为正常技术帖)
    "很多新手搞不懂SpringCloud微服务架构，其实核心就是服务注册发现和熔断降级。我整理了阿里P8架构师的内部笔记，包含Eureka和Hystrix源码解析，关注公众号回复666免费领。",
    
    # 3. 包含技术词汇的日常闲聊 (测试模型是否会被名词“骗”过去)
    "今天去相亲，那妹子长得就像一个未经CSS美化的原生HTML，性格还跟单线程一样不懂得并发，跟我这种多态的Java男完全不匹配，还是回家打游戏吧。",
    
    # 4. 纯报错日志/堆栈 (测试英文字符串分词和标点符号过滤是否破坏了特征)
    "Uncaught TypeError: Cannot read properties of undefined (reading 'map') at renderList (App.jsx:42:15) at commitHookEffectListMount (react-dom.development.js:23150)",
    
    # 5. 黑话/缩写/口语化技术帖 (缺乏标准书面名词，看模型是否认识缩写)
    "大佬们，k8s集群里的pod老是OOM重启，查了下是java应用的堆外内存泄露，用arthas打出来的火焰图也没看出啥，咋整？",
    
    # 6. 纯逻辑/算法思维探讨 (无具体框架名词，测试是否能识别通用计算机科学词汇)
    "如果一个链表有环，怎么用O(1)的空间复杂度找到入环的第一个节点？快慢指针相遇之后该怎么推导步数关系？",
    
    # 7. 招聘/求职帖 (介于垃圾与正常社区内容之间，看聚类如何处理)
    "【急招】杭州滨江区招高级前端，熟练掌握Vue3/React，了解Nodejs优先，周末双休不卷，薪资20-35k，欢迎砸简历！",
    
    # 8. 中英夹杂且包含长拼写的底层求助 (测试英文长词保留情况)
    "在做Embedded System开发的时候，Interrupt Service Routine (ISR) 里面调用了阻塞函数导致整个RTOS直接卡死，有什么好的调试思路吗？"
]

print("=== CodeHub 机器学习服务抗压测试 ===")
for i, text in enumerate(tricky_test_cases, 1):
    try:
        res = requests.post(URL, json={"text": text}, timeout=5)
        data = res.json()
        tags_str = ", ".join(data["tags"]) if data["tags"] else "(无)"
        junk_str = "垃圾帖" if data["is_junk"] else "技术帖"
        confidence = data.get("confidence", 0)
        
        # 截取前40个字符展示
        display_text = text[:40].replace('\n', ' ') + "..."
        print(f"[{i:2d}] {junk_str} (置信度: {confidence:.3f})")
        print(f"     预测分类: {data.get('cluster_name', '无')} | 提取标签: {tags_str}")
        print(f"     文本内容: {display_text}\n")
    except Exception as e:
        print(f"[{i:2d}] 接口请求错误: {e}\n")