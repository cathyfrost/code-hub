from pathlib import Path

# 项目根目录
BASE_DIR = Path(__file__).resolve().parent

# 数据路径
DATA_DIR = BASE_DIR / "data"
RAW_DATA_DIR = DATA_DIR / "raw"
PROCESSED_DATA_DIR = DATA_DIR / "processed"
STOPWORDS_DIR = DATA_DIR / "stopwords"

# 数据文件
CORPUS_FILE = RAW_DATA_DIR / "posts_corpus.csv"
TRAIN_FILE = PROCESSED_DATA_DIR / "train.csv"
TEST_FILE = PROCESSED_DATA_DIR / "test.csv"

# 停用词
CN_STOPWORDS_FILE = STOPWORDS_DIR / "cn_stopwords.txt"
TECH_STOPWORDS_FILE = STOPWORDS_DIR / "tech_stopwords.txt"

# 自定义词典与同义词
JIEBA_USERDICT_FILE = DATA_DIR / "jieba_userdict.txt"
TECH_SYNONYMS_FILE = DATA_DIR / "tech_synonyms.json"

# 模型路径
MODELS_DIR = BASE_DIR / "models"
TFIDF_MODEL_FILE = MODELS_DIR / "tfidf_vectorizer.pkl"
KMEANS_MODEL_FILE = MODELS_DIR / "kmeans_model.pkl"
JUNK_CLF_MODEL_FILE = MODELS_DIR / "junk_classifier.pkl"
CLUSTER_LABELS_FILE = MODELS_DIR / "cluster_labels.json"

# 图表输出
FIGURES_DIR = BASE_DIR / "outputs" / "figures"

# ── 模型超参数 ──
# TF-IDF
TFIDF_MAX_FEATURES = 5000
TFIDF_MAX_DF = 0.85
TFIDF_MIN_DF = 2
TFIDF_NGRAM_RANGE = (1, 2)

# K-Means
KMEANS_K_RANGE = range(2, 21)     # 肘部法则搜索范围
KMEANS_N_INIT = 10
KMEANS_MAX_ITER = 300
KMEANS_RANDOM_STATE = 42

# 垃圾分类器
JUNK_NB_ALPHA = 1.0               # 朴素贝叶斯拉普拉斯平滑

# 推理阈值
JUNK_CONFIDENCE_THRESHOLD = 0.8   # 垃圾概率 > 此值判定为垃圾

# 数据集划分
TEST_SIZE = 0.2
RANDOM_STATE = 42