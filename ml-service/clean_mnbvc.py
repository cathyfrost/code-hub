"""
MNBVC 技术帖二次清洗脚本
1. 去除明显的非技术噪音（医疗、游戏角色、生活常识）
2. 对 "网络" 标签减采样，平衡分布
3. 重新分类标签
"""

import pandas as pd
import re
import os
import random

random.seed(42)

INPUT_PATH = os.path.join("data", "raw", "mnbvc_tech.csv")
OUTPUT_PATH = os.path.join("data", "raw", "mnbvc_tech.csv")  # 覆盖

# ── 噪音关键词：包含这些词的帖子直接剔除 ──
NOISE_KEYWORDS = [
    # 医疗健康
    "白带", "月经", "怀孕", "避孕", "妇科", "性生活", "阴道", "子宫",
    "皮肤病", "感冒", "发烧", "头疼", "咳嗽", "拉肚子", "便秘",
    "痘痘", "过敏", "减肥", "丰胸", "脱发", "近视", "牙疼",
    "医院", "挂号", "药", "症状", "治疗", "诊断",
    # 游戏角色/任务（非技术讨论）
    "转职", "一转", "二转", "升级", "副本", "装备",
    "战士", "法师", "刺客", "坦克", "射手", "辅助",
    "打怪", "刷图", "PK", "竞技场", "公会",
    "经验值", "技能点", "天赋", "属性点",
    # 生活常识
    "做菜", "煮饭", "洗衣", "打扫", "装修", "家具",
    "化妆", "护肤", "穿搭", "发型",
    "驾照", "考驾照", "科目",
    # 情感/社交
    "恋爱", "分手", "表白", "暗恋", "相亲",
    "星座", "算命", "风水", "解梦",
    # 法律/金融（非技术）
    "律师", "起诉", "法院", "合同纠纷",
    "股票", "基金", "理财", "炒股", "开户",
]

NOISE_PATTERN = re.compile("|".join(re.escape(kw) for kw in NOISE_KEYWORDS))

# ── 更精确的技术关键词（必须至少命中一个才保留）──
STRICT_TECH_KEYWORDS = [
    "python", "java", "javascript", "c++", "c#", "php", "golang", "rust",
    "html", "css", "react", "vue", "angular", "node",
    "spring", "django", "flask", "mybatis",
    "mysql", "sql", "oracle", "mongodb", "redis", "数据库",
    "linux", "ubuntu", "centos", "命令行", "shell", "bash",
    "docker", "nginx", "服务器", "apache",
    "http", "tcp", "ip地址", "dns", "端口", "协议", "路由器",
    "网络设置", "网络连接", "上网", "无线网", "wifi", "宽带",
    "编程", "代码", "程序", "软件开发", "编译", "调试",
    "函数", "变量", "数组", "循环", "对象", "类",
    "线程", "进程", "内存", "指针", "堆栈",
    "算法", "排序", "递归", "二叉树",
    "人工智能", "机器学习", "深度学习",
    "android", "ios", "app", "小程序",
    "git", "github",
    # 电脑相关（百度知道常见）
    "电脑", "系统", "windows", "win7", "win10", "xp",
    "蓝屏", "死机", "开机", "重装系统", "驱动",
    "浏览器", "IE", "chrome", "firefox",
    "杀毒", "防火墙", "木马", "病毒",
    "硬盘", "内存条", "显卡", "CPU", "主板", "电源",
    "U盘", "光驱", "鼠标", "键盘",
    "office", "word", "excel", "ppt", "pdf",
    "ps", "photoshop", "cad",
    "文件", "文件夹", "格式", "压缩", "解压",
    "下载", "安装", "卸载", "注册表",
]

STRICT_TECH_PATTERN = re.compile(
    "|".join(re.escape(kw) for kw in STRICT_TECH_KEYWORDS),
    re.IGNORECASE
)


def reclassify(text: str, old_tag: str) -> str:
    """更精确的重新分类"""
    t = text.lower()

    rules = [
        (["python", "django", "flask", "pip"], "Python"),
        (["java ", "spring", "mybatis", "jdk", "jvm", "tomcat"], "Java"),
        (["javascript", "js ", "jquery", "node.js", "npm"], "JavaScript"),
        (["html", "css", "网页", "浏览器", "ie ", "chrome", "firefox"], "前端/浏览器"),
        (["react", "vue", "angular", "webpack", "前端"], "前端/浏览器"),
        (["mysql", "sql", "oracle", "mongodb", "数据库", "表"], "数据库"),
        (["linux", "ubuntu", "centos", "shell", "bash"], "Linux"),
        (["windows", "win7", "win10", "xp", "注册表", "蓝屏", "系统"], "Windows系统"),
        (["android", "安卓", "ios", "苹果手机", "app", "小程序"], "移动端"),
        (["路由", "wifi", "无线", "宽带", "上网", "网络连接", "dns"], "网络配置"),
        (["ip", "tcp", "http", "端口", "协议", "代理"], "网络协议"),
        (["杀毒", "病毒", "木马", "防火墙", "安全"], "网络安全"),
        (["硬盘", "内存条", "显卡", "cpu", "主板", "硬件"], "硬件"),
        (["office", "word", "excel", "ppt", "ps", "photoshop", "cad"], "办公软件"),
        (["编程", "代码", "程序", "函数", "变量", "循环", "调试"], "编程基础"),
        (["算法", "排序", "递归", "数据结构"], "算法"),
        (["人工智能", "机器学习", "深度学习"], "AI/ML"),
        (["git", "github"], "Git"),
        (["docker", "nginx", "服务器", "部署"], "DevOps"),
        (["下载", "安装", "软件", "卸载"], "软件工具"),
        (["文件", "格式", "压缩", "u盘"], "文件管理"),
    ]

    for keywords, tag in rules:
        if any(kw in t for kw in keywords):
            return tag

    return old_tag


def main():
    df = pd.read_csv(INPUT_PATH, encoding="utf-8-sig")
    print(f"原始: {len(df)} 条")

    # Step 1: 去除噪音
    noise_mask = df["content"].astype(str).apply(lambda x: bool(NOISE_PATTERN.search(x)))
    df = df[~noise_mask]
    print(f"去噪后: {len(df)} 条 (去除 {noise_mask.sum()} 条噪音)")

    # Step 2: 严格技术关键词过滤
    tech_mask = df["content"].astype(str).apply(lambda x: bool(STRICT_TECH_PATTERN.search(x)))
    df = df[tech_mask]
    print(f"严格过滤后: {len(df)} 条")

    # Step 3: 重新分类
    df["category"] = df.apply(
        lambda row: reclassify(str(row["content"]), str(row["category"])),
        axis=1
    )

    # Step 4: 减采样过大的类别
    max_per_category = 500
    balanced_frames = []
    for cat, group in df.groupby("category"):
        if len(group) > max_per_category:
            group = group.sample(n=max_per_category, random_state=42)
        balanced_frames.append(group)

    df = pd.concat(balanced_frames, ignore_index=True)

    # 重新编号
    df = df.reset_index(drop=True)
    df["id"] = range(1, len(df) + 1)

    # 保存
    df.to_csv(OUTPUT_PATH, index=False, encoding="utf-8-sig")

    print(f"\n最终: {len(df)} 条")
    print(f"\n标签分布:")
    for cat, cnt in df["category"].value_counts().items():
        print(f"  {cat:<14s}: {cnt}")

    # 示例
    print(f"\n示例:")
    for _, row in df.sample(min(10, len(df)), random_state=99).iterrows():
        print(f"  [{row['category']}] {str(row['content'])[:70]}...")


if __name__ == "__main__":
    main()