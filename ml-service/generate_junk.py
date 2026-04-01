"""
垃圾样本批量生成脚本
基于模板 + 随机组合生成 3000 条多样化的非技术内容
论文中描述为"基于模板的数据增强策略 (Template-based Data Augmentation)"
"""

import csv
import os
import random

random.seed(42)

# ── 模板库：{slot} 会被随机替换 ──

TEMPLATES = {
    "日常吐槽": [
        "今天{time}{negative_event}，{mood}",
        "{negative_event}，{mood}",
        "又是{negative_event}的一天",
        "{time}{negative_event}好{negative_adj}",
        "为什么{negative_event}，{mood}",
        "{mood}，{negative_event}",
        "真的{negative_adj}，{negative_event}",
        "好{negative_adj}啊{negative_event}",
    ],
    "工作吐槽": [
        "上班{work_event}，{mood}",
        "{work_event}，不想上班了",
        "今天{work_event}，{work_mood}",
        "公司{work_event}真的{negative_adj}",
        "{work_event}，{time}才下班",
        "老板{boss_action}，{mood}",
        "同事{colleague_action}，{negative_adj}",
        "又{work_event}了，第{num}次了",
        "加班到{late_time}，{work_mood}",
        "{work_event}搞得我{negative_adj}",
    ],
    "美食": [
        "今天吃了{food}，{food_comment}",
        "{food}真的{food_adj}",
        "推荐一家{place}的{food}，{food_comment}",
        "自己做了{food}，{food_result}",
        "中午吃{food}还是{food2}好纠结",
        "想吃{food}了{mood}",
        "{food}配{drink}绝了",
        "排队{num}分钟就为了吃{food}",
    ],
    "天气": [
        "今天{weather}，{weather_reaction}",
        "{city}的{weather}太{negative_adj}了",
        "{weather}天{weather_action}",
        "这个{season}{weather}好{negative_adj}",
        "{weather}了出门忘带{weather_item}",
    ],
    "购物": [
        "买了{item}，{shop_comment}",
        "{item}{shop_adj}想退货",
        "{platform}上买的{item}{shop_result}",
        "种草了一个{item}好{shop_desire}",
        "快递{delivery_status}，{mood}",
        "{sale_event}买了一堆{item}",
        "{item}打折了要不要入手",
        "冲动消费买了{item}后悔了",
    ],
    "情感": [
        "和{person}{relationship_event}了",
        "{relationship_event}好{negative_adj}",
        "{person}{relationship_action}，{mood}",
        "好想{relationship_wish}",
        "异地恋{relationship_event}太难了",
        "被{person}{relationship_event}了好{negative_adj}",
        "单身{time_duration}了{mood}",
        "{person}说{relationship_words}",
    ],
    "娱乐": [
        "昨晚看{entertainment}到{late_time}",
        "{entertainment}真的{entertainment_adj}",
        "推荐{entertainment}，{entertainment_comment}",
        "追{entertainment}追到停不下来",
        "{entertainment}更新了{mood}",
        "最近迷上了{entertainment}",
        "{entertainment}大结局{entertainment_adj}",
    ],
    "游戏": [
        "打{game}{game_event}",
        "{game}{game_event}，{mood}",
        "今天{game}里{game_event}",
        "{game}更新了{game_content}",
        "连输{num}把{game}{mood}",
        "终于在{game}里{game_achievement}",
        "{game}的{game_content}{entertainment_adj}",
        "和朋友一起打{game}{game_event}",
    ],
    "学生日常": [
        "{exam}要来了还没{study_action}",
        "在{study_place}{study_event}",
        "论文{paper_event}，{mood}",
        "{exam}{exam_result}，{mood}",
        "选课{course_event}",
        "{study_event}好{negative_adj}",
        "绩点{gpa_event}，{mood}",
        "室友{roommate_action}，{negative_adj}",
        "导师{teacher_action}",
        "图书馆{library_event}",
    ],
    "交通出行": [
        "{transport}{transport_event}",
        "堵车堵了{num}分钟",
        "{transport}上{transport_activity}",
        "打车{transport_event}",
        "通勤{num}小时太{negative_adj}了",
        "高铁票{ticket_event}",
        "{city}的{transport}太{negative_adj}了",
    ],
    "宠物": [
        "家里的{pet}{pet_action}",
        "{pet}今天{pet_action}好{pet_adj}",
        "带{pet}去{pet_place}{pet_event}",
        "{pet}又{pet_action}了",
        "想养{pet}但是{pet_obstacle}",
        "撸{pet}撸到{time}",
        "{pet}生病了{mood}",
    ],
    "健康": [
        "最近{health_symptom}，{mood}",
        "{health_action}了{num}天{health_result}",
        "去医院{health_event}",
        "失眠{time_duration}了{mood}",
        "{body_part}{health_symptom}好{negative_adj}",
        "体检报告{health_result}",
    ],
    "租房": [
        "房东{landlord_action}",
        "房租又涨了{mood}",
        "找房子{rent_event}",
        "室友{roommate_action}受不了",
        "搬家{move_event}",
        "租的房子{house_problem}",
    ],
    "带技术词的吐槽": [
        "写了一天代码{negative_adj}死了",
        "产品经理又改需求了第{num}版了",
        "面试被问{tech_topic}完全不会",
        "投了{num}份简历才收到{num2}个面试",
        "debug了一整天结果是{silly_bug}",
        "线上出bug被叫回去加班",
        "同事写的代码{code_complaint}",
        "公司技术栈太老了想跳槽",
        "代码写得好不如PPT做得好",
        "35岁程序员{career_worry}",
        "外包公司太坑了{mood}",
        "转行做程序员好难{mood}",
        "开会开了{num}小时一行代码没写",
        "电脑又{computer_problem}了",
        "年终奖才{num}个月工资{mood}",
        "offer选择困难症{mood}",
        "新来的实习生天天问我问题",
        "代码review被喷了{mood}",
        "甲方说{client_words}",
        "项目延期了{mood}",
    ],
}

# ── 槽位填充词库 ──

SLOTS = {
    "time": ["今天", "昨天", "刚才", "早上", "下午", "晚上", "周末", "中午"],
    "negative_event": [
        "加班", "迟到了", "被骂了", "睡过头了", "丢东西了", "手机没电了",
        "错过公交了", "忘带钥匙了", "摔了一跤", "被淋雨了", "钱包丢了",
        "被放鸽子了", "排了好久的队", "等了半天外卖", "衣服被弄脏了",
    ],
    "mood": [
        "好烦", "心累", "emo了", "破防了", "无语", "裂开了", "想哭",
        "好无聊", "好焦虑", "不开心", "生气", "郁闷", "头疼",
        "好绝望", "太难了", "想回家", "好想睡觉", "算了",
    ],
    "negative_adj": ["累", "烦", "难受", "无聊", "崩溃", "离谱", "无语", "绝望", "窒息", "头大"],
    "work_event": [
        "开了三小时会", "被客户投诉", "改了五版方案", "加班到半夜",
        "做了一堆无用功", "项目又延期了", "被领导点名了", "考核没过",
        "背了个大锅", "需求又变了", "系统崩了", "干了一天杂活",
    ],
    "work_mood": ["不想干了", "想辞职", "好累", "心态崩了", "怀疑人生", "麻了"],
    "boss_action": [
        "又画大饼了", "说要加班", "开会批评我", "不批假", "给我加了新任务",
        "让我周末来", "说年底再涨薪", "PUA我",
    ],
    "colleague_action": [
        "摸鱼被发现了", "甩锅给我", "上班外放视频", "请假我得替班",
        "天天迟到没人管", "开会打瞌睡", "午休打呼噜",
    ],
    "late_time": ["十点", "十一点", "凌晨", "半夜", "九点半", "深夜"],
    "num": ["2", "3", "5", "6", "7", "8", "10", "15", "20", "30", "50", "100"],
    "num2": ["1", "2", "3"],
    "food": [
        "火锅", "烧烤", "奶茶", "炸鸡", "汉堡", "拉面", "饺子", "螺蛳粉",
        "寿司", "披萨", "麻辣烫", "冒菜", "烤鱼", "铁板饭", "黄焖鸡",
        "煎饼果子", "肉夹馍", "小龙虾", "烤串", "盖饭",
    ],
    "food2": [
        "米饭", "面条", "包子", "馒头", "粥", "沙拉", "三明治", "便当",
    ],
    "drink": ["可乐", "奶茶", "咖啡", "啤酒", "果汁", "柠檬水"],
    "food_comment": ["太好吃了", "一般般", "踩雷了", "强烈推荐", "性价比高", "味道不错"],
    "food_adj": ["好吃", "难吃", "一般", "绝了", "上头"],
    "food_result": ["成功了", "翻车了", "味道还行", "糊了", "卖相不好但好吃"],
    "place": ["学校附近", "公司楼下", "商场里", "街边", "夜市", "网红店"],
    "weather": ["下雨", "下雪", "大风", "雾霾", "暴晒", "阴天", "台风", "冰雹"],
    "weather_reaction": ["不想出门", "心情好好", "出门记得带伞", "好冷", "好热"],
    "weather_action": ["出门忘带伞", "路上滑倒了", "衣服白洗了", "堵车更严重了"],
    "weather_item": ["伞", "外套", "帽子", "墨镜"],
    "city": ["北京", "上海", "广州", "深圳", "杭州", "成都", "武汉", "南京", "重庆", "长沙"],
    "season": ["冬天", "夏天", "春天", "秋天"],
    "item": [
        "衣服", "鞋子", "耳机", "手机壳", "键盘", "包", "化妆品", "零食",
        "书", "游戏机", "平板", "手表", "眼镜", "充电宝",
    ],
    "shop_comment": ["质量一般", "还不错", "不值这个价", "超出预期", "和图片不符"],
    "shop_adj": ["质量太差", "尺码不对", "颜色不对", "有瑕疵", "和描述不符"],
    "shop_result": ["还没发货", "物流好慢", "收到了很满意", "退货了", "破损了"],
    "shop_desire": ["想买", "种草", "纠结"],
    "platform": ["淘宝", "京东", "拼多多", "闲鱼", "抖音"],
    "delivery_status": ["三天了还没到", "显示签收但没收到", "送到别人家了", "破损了"],
    "sale_event": ["双十一", "618", "打折", "清仓"],
    "person": ["男朋友", "女朋友", "对象", "暗恋的人", "前任", "相亲对象", "朋友"],
    "relationship_event": ["吵架", "分手", "冷战", "表白", "复合", "约会"],
    "relationship_action": ["不回消息", "生气了", "说了分手", "太忙了", "忘了纪念日"],
    "relationship_wish": ["谈恋爱", "有个人陪", "脱单", "被表白"],
    "relationship_words": ["我们不合适", "需要冷静", "你变了", "再想想"],
    "time_duration": ["半年", "一年", "两年", "三个月", "好久"],
    "entertainment": [
        "电影", "电视剧", "综艺", "小说", "动漫", "韩剧", "美剧",
        "纪录片", "脱口秀", "短视频",
    ],
    "entertainment_adj": ["好看", "难看", "上头", "无聊", "烂尾了", "神作", "一般般"],
    "entertainment_comment": ["超好看", "看哭了", "笑死我了", "剧情一般", "演员演技好"],
    "game": ["王者荣耀", "原神", "英雄联盟", "和平精英", "永劫无间", "蛋仔派对", "崩坏星穹铁道", "明日方舟"],
    "game_event": ["连输了", "上分了", "掉段了", "被队友坑了", "赢了好开心", "匹配到挂"],
    "game_content": ["新角色", "新地图", "新皮肤", "新版本", "新活动"],
    "game_achievement": ["上了王者", "通关了", "抽到了想要的", "满星了"],
    "exam": ["期末考试", "四六级", "考研", "雅思", "托福", "教资", "公务员考试", "期中考试"],
    "exam_result": ["过了", "挂了", "成绩出了", "分数很低"],
    "study_action": ["开始复习", "看书", "做题", "准备"],
    "study_place": ["图书馆", "自习室", "宿舍", "咖啡厅", "教室"],
    "study_event": ["看书看不进去", "睡着了", "玩手机", "效率好低", "复习到崩溃"],
    "paper_event": ["查重率太高", "被打回来了", "写不下去", "格式又改了", "答辩紧张"],
    "course_event": ["选不上", "太无聊了", "被取消了", "和别的课冲突"],
    "gpa_event": ["太低了", "没希望了", "勉强及格", "拉了"],
    "roommate_action": [
        "打游戏太吵", "半夜打电话", "不讲卫生", "外放视频", "打呼噜",
        "用我的东西", "不关灯",
    ],
    "teacher_action": ["又催进度了", "让改论文", "不回消息", "布置了一堆作业"],
    "library_event": ["没位子了", "占不到座", "空调太冷了", "好吵"],
    "transport": ["地铁", "公交", "高铁", "出租车", "共享单车"],
    "transport_event": ["迟到了", "坐过站了", "挤不上去", "等了好久", "没赶上"],
    "transport_activity": ["看手机", "听歌", "睡着了", "被踩了脚"],
    "ticket_event": ["抢不到", "买贵了", "被退了", "改签了"],
    "pet": ["猫", "狗", "仓鼠", "兔子"],
    "pet_action": ["把杯子推下去了", "拆家了", "不吃饭", "一直叫", "跑丢了", "上床睡觉"],
    "pet_adj": ["可爱", "调皮", "乖", "搞笑"],
    "pet_place": ["宠物医院", "宠物店", "公园"],
    "pet_event": ["打疫苗", "洗澡", "做绝育", "体检"],
    "pet_obstacle": ["宿舍不让养", "房东不同意", "没时间照顾", "过敏"],
    "health_symptom": ["失眠", "头疼", "腰酸背痛", "感冒", "过敏", "牙疼", "眼睛干涩"],
    "health_action": ["减肥", "健身", "跑步", "节食", "早睡"],
    "health_result": ["没效果", "瘦了一点", "更累了", "有一项指标不正常", "还好都正常"],
    "health_event": ["排队两小时", "挂不上号", "做了个检查", "拔智齿"],
    "body_part": ["腰", "脖子", "肩膀", "膝盖", "眼睛", "胃"],
    "landlord_action": ["涨房租了", "不退押金", "不修东西", "要卖房让我搬"],
    "rent_event": ["找了一周了", "太贵了", "位置太偏", "被中介坑了"],
    "house_problem": ["漏水", "隔音差", "没有空调", "网络不好", "太小了"],
    "move_event": ["太累了", "东西太多", "找不到搬家公司", "花了好多钱"],
    "tech_topic": [
        "算法", "数据库", "操作系统", "计算机网络", "设计模式",
        "系统设计", "红黑树", "分布式", "微服务", "消息队列",
    ],
    "silly_bug": [
        "拼写错误", "少了个分号", "大小写写错了", "变量名打错了",
        "忘了保存文件", "调的是测试环境", "缓存没清", "import少了",
    ],
    "code_complaint": [
        "看不懂", "没有注释", "变量名全是abc", "一个函数两百行",
        "到处都是bug", "重复代码太多", "命名风格不统一",
    ],
    "career_worry": ["真的会被裁吗", "好焦虑", "在想要不要转管理", "该怎么规划"],
    "computer_problem": ["蓝屏", "死机", "卡了", "黑屏", "过热关机", "连不上网"],
    "client_words": [
        "这个很简单的", "能不能今天就做完", "我觉得不好看换一个",
        "之前那版更好", "加个功能应该很快吧",
    ],
}


def fill_template(template: str) -> str:
    """将模板中的 {slot} 替换为随机选取的词"""
    result = template
    # 找出所有 {xxx} 槽位
    import re
    slots_in_template = re.findall(r'\{(\w+)\}', template)
    for slot_name in slots_in_template:
        if slot_name in SLOTS:
            replacement = random.choice(SLOTS[slot_name])
            result = result.replace("{" + slot_name + "}", replacement, 1)
    return result


def generate_junk_samples(target_count: int = 3000) -> list[str]:
    """生成指定数量的垃圾样本"""
    samples = set()
    categories = list(TEMPLATES.keys())

    # 每个类别均匀生成
    per_category = target_count // len(categories) + 1

    for cat_name in categories:
        cat_templates = TEMPLATES[cat_name]
        generated = 0
        attempts = 0

        while generated < per_category and attempts < per_category * 10:
            template = random.choice(cat_templates)
            text = fill_template(template)
            if text and len(text) >= 5 and text not in samples:
                samples.add(text)
                generated += 1
            attempts += 1

    return list(samples)[:target_count]


def main():
    samples = generate_junk_samples(3000)

    output_path = os.path.join("data", "raw", "generated_junk.csv")
    os.makedirs(os.path.dirname(output_path), exist_ok=True)

    with open(output_path, "w", newline="", encoding="utf-8-sig") as f:
        writer = csv.writer(f)
        writer.writerow(["id", "content", "category", "is_junk"])
        for i, text in enumerate(samples, 1):
            writer.writerow([i, text, "", 1])

    print(f"生成 {len(samples)} 条垃圾样本")
    print(f"保存到 {output_path}")

    # 统计各类别分布
    print(f"\n示例:")
    random.seed(123)
    for text in random.sample(samples, 15):
        print(f"  {text}")


if __name__ == "__main__":
    main()