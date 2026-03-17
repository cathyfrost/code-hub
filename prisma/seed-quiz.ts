import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const quizzes = [
  {
    title: "两数之和",
    description: `## 题目描述

给定一个整数数组 \`nums\` 和一个整数目标值 \`target\`，请你在该数组中找出和为目标值的那两个整数，并返回它们的**下标**。

你可以假设每种输入只会对应一个答案，并且不能使用相同的元素两次。

按升序输出两个下标，用空格分隔。

## 输入格式

- 第一行：空格分隔的整数数组
- 第二行：目标值 target

## 输出格式

- 一行，两个下标（空格分隔，升序）`,
    difficulty: "easy",
    tags: ["数组", "哈希表"],
    order: 1,
    examples: [
      { input: "2 7 11 15\n9", output: "0 1", explanation: "nums[0] + nums[1] = 2 + 7 = 9" },
      { input: "3 2 4\n6", output: "1 2", explanation: "nums[1] + nums[2] = 2 + 4 = 6" },
    ],
    testCases: [
      { input: "2 7 11 15\n9", expectedOutput: "0 1" },
      { input: "3 2 4\n6", expectedOutput: "1 2" },
      { input: "3 3\n6", expectedOutput: "0 1" },
      { input: "1 5 3 7 2\n9", expectedOutput: "3 4" },
      { input: "-1 -2 -3 -4 -5\n-8", expectedOutput: "2 4" },
    ],
    starterCode: {
      cpp: `#include <iostream>
#include <vector>
#include <unordered_map>
#include <sstream>
using namespace std;

int main() {
    vector<int> nums;
    string line;
    getline(cin, line);
    istringstream iss(line);
    int val;
    while (iss >> val) {
        nums.push_back(val);
    }

    int target;
    cin >> target;

    // TODO: 找出两数之和等于 target 的下标

    return 0;
}`,
      python: `nums = list(map(int, input().split()))
target = int(input())

# TODO: 找出两数之和等于 target 的下标
`,
      javascript: `const readline = require('readline');
const rl = readline.createInterface({ input: process.stdin });
const lines = [];
rl.on('line', l => lines.push(l));
rl.on('close', () => {
  const nums = lines[0].split(' ').map(Number);
  const target = Number(lines[1]);

  // TODO: 找出两数之和等于 target 的下标
});`,
      java: `import java.util.*;

public class Main {
    public static void main(String[] args) {
        Scanner sc = new Scanner(System.in);
        String[] parts = sc.nextLine().split(" ");
        int[] nums = new int[parts.length];
        for (int i = 0; i < parts.length; i++) {
            nums[i] = Integer.parseInt(parts[i]);
        }
        int target = Integer.parseInt(sc.nextLine().trim());

        // TODO: 找出两数之和等于 target 的下标
    }
}`,
      go: `package main

import (
	"bufio"
	"fmt"
	"os"
	"strconv"
	"strings"
)

func main() {
	reader := bufio.NewReader(os.Stdin)
	line, _ := reader.ReadString('\\n')
	line = strings.TrimSpace(line)
	parts := strings.Split(line, " ")
	nums := make([]int, len(parts))
	for i, p := range parts {
		nums[i], _ = strconv.Atoi(p)
	}

	line2, _ := reader.ReadString('\\n')
	target, _ := strconv.Atoi(strings.TrimSpace(line2))
	_ = target

	// TODO: 找出两数之和等于 target 的下标
	fmt.Println()
}`,
      rust: `use std::io;

fn main() {
    let mut input = String::new();
    io::stdin().read_line(&mut input).unwrap();
    let nums: Vec<i32> = input.trim().split_whitespace()
        .map(|x| x.parse().unwrap()).collect();

    let mut input2 = String::new();
    io::stdin().read_line(&mut input2).unwrap();
    let target: i32 = input2.trim().parse().unwrap();
    let _ = target;

    // TODO: 找出两数之和等于 target 的下标
    println!();
}`,
    },
  },
  {
    title: "斐波那契数列",
    description: `## 题目描述

给定一个非负整数 \`n\`，请计算斐波那契数列的第 \`n\` 项。

斐波那契数列定义：
- F(0) = 0
- F(1) = 1
- F(n) = F(n-1) + F(n-2)，当 n > 1

## 输入格式

一个非负整数 n（0 ≤ n ≤ 45）

## 输出格式

斐波那契数列第 n 项的值`,
    difficulty: "easy",
    tags: ["数学", "递归", "动态规划"],
    order: 2,
    examples: [
      { input: "0", output: "0" },
      { input: "1", output: "1" },
      { input: "10", output: "55", explanation: "F(10) = 55" },
    ],
    testCases: [
      { input: "0", expectedOutput: "0" },
      { input: "1", expectedOutput: "1" },
      { input: "5", expectedOutput: "5" },
      { input: "10", expectedOutput: "55" },
      { input: "20", expectedOutput: "6765" },
      { input: "30", expectedOutput: "832040" },
      { input: "45", expectedOutput: "1134903170" },
    ],
    starterCode: {
      cpp: `#include <iostream>
using namespace std;

int main() {
    int n;
    cin >> n;
    // TODO: 计算斐波那契数列第 n 项
    return 0;
}`,
      python: `n = int(input())
# TODO: 计算斐波那契数列第 n 项
`,
      javascript: `const n = Number(require('fs').readFileSync('/dev/stdin', 'utf8').trim());
// TODO: 计算斐波那契数列第 n 项
`,
      java: `import java.util.Scanner;

public class Main {
    public static void main(String[] args) {
        Scanner sc = new Scanner(System.in);
        int n = sc.nextInt();
        // TODO: 计算斐波那契数列第 n 项
    }
}`,
      go: `package main

import "fmt"

func main() {
	var n int
	fmt.Scan(&n)
	// TODO: 计算斐波那契数列第 n 项
	fmt.Println()
}`,
      rust: `use std::io;

fn main() {
    let mut input = String::new();
    io::stdin().read_line(&mut input).unwrap();
    let n: i32 = input.trim().parse().unwrap();
    let _ = n;
    // TODO: 计算斐波那契数列第 n 项
    println!();
}`,
    },
  },
  {
    title: "回文字符串判断",
    description: `## 题目描述

给定一个字符串 \`s\`，判断它是否是回文字符串。

回文字符串指正序和倒序完全相同的字符串。只考虑字母和数字字符，忽略大小写。

## 输入格式

一行字符串 s

## 输出格式

如果是回文输出 \`true\`，否则输出 \`false\``,
    difficulty: "easy",
    tags: ["字符串", "双指针"],
    order: 3,
    examples: [
      { input: "A man a plan a canal Panama", output: "true", explanation: "去掉空格和标点，忽略大小写后为 amanaplanacanalpanama，是回文" },
      { input: "race a car", output: "false" },
    ],
    testCases: [
      { input: "A man a plan a canal Panama", expectedOutput: "true" },
      { input: "race a car", expectedOutput: "false" },
      { input: " ", expectedOutput: "true" },
      { input: "ab", expectedOutput: "false" },
      { input: "aba", expectedOutput: "true" },
      { input: "12321", expectedOutput: "true" },
      { input: "Hello olleH", expectedOutput: "true" },
    ],
    starterCode: {
      cpp: `#include <iostream>
#include <string>
using namespace std;

int main() {
    string s;
    getline(cin, s);
    // TODO: 判断是否是回文字符串
    return 0;
}`,
      python: `s = input()
# TODO: 判断是否是回文字符串
`,
      javascript: `const s = require('fs').readFileSync('/dev/stdin', 'utf8').trim();
// TODO: 判断是否是回文字符串
`,
      java: `import java.util.Scanner;

public class Main {
    public static void main(String[] args) {
        Scanner sc = new Scanner(System.in);
        String s = sc.nextLine();
        // TODO: 判断是否是回文字符串
    }
}`,
      go: `package main

import (
	"bufio"
	"fmt"
	"os"
	"strings"
)

func main() {
	reader := bufio.NewReader(os.Stdin)
	s, _ := reader.ReadString('\\n')
	s = strings.TrimSpace(s)
	_ = s
	// TODO: 判断是否是回文字符串
	fmt.Println()
}`,
      rust: `use std::io;

fn main() {
    let mut s = String::new();
    io::stdin().read_line(&mut s).unwrap();
    let s = s.trim();
    let _ = s;
    // TODO: 判断是否是回文字符串
    println!();
}`,
    },
  },
  {
    title: "有效的括号",
    description: `## 题目描述

给定一个只包含 \`(\`、\`)\`、\`{\`、\`}\`、\`[\`、\`]\` 的字符串 \`s\`，判断字符串是否有效。

有效字符串需满足：
1. 左括号必须用相同类型的右括号闭合
2. 左括号必须以正确的顺序闭合
3. 每个右括号都有对应的左括号

## 输入格式

一行只包含括号的字符串

## 输出格式

有效输出 \`true\`，无效输出 \`false\``,
    difficulty: "easy",
    tags: ["栈", "字符串"],
    order: 4,
    examples: [
      { input: "()", output: "true" },
      { input: "()[]{}", output: "true" },
      { input: "(]", output: "false" },
      { input: "([)]", output: "false" },
    ],
    testCases: [
      { input: "()", expectedOutput: "true" },
      { input: "()[]{}", expectedOutput: "true" },
      { input: "(]", expectedOutput: "false" },
      { input: "([)]", expectedOutput: "false" },
      { input: "{[]}", expectedOutput: "true" },
      { input: "", expectedOutput: "true" },
      { input: "((()))", expectedOutput: "true" },
      { input: "(()", expectedOutput: "false" },
    ],
    starterCode: {
      cpp: `#include <iostream>
#include <stack>
using namespace std;

int main() {
    string s;
    getline(cin, s);
    // TODO: 判断括号是否有效
    return 0;
}`,
      python: `s = input()
# TODO: 判断括号是否有效
`,
      javascript: `const s = require('fs').readFileSync('/dev/stdin', 'utf8').trim();
// TODO: 判断括号是否有效
`,
      java: `import java.util.*;

public class Main {
    public static void main(String[] args) {
        Scanner sc = new Scanner(System.in);
        String s = sc.nextLine();
        // TODO: 判断括号是否有效
    }
}`,
      go: `package main

import (
	"bufio"
	"fmt"
	"os"
	"strings"
)

func main() {
	reader := bufio.NewReader(os.Stdin)
	s, _ := reader.ReadString('\\n')
	s = strings.TrimSpace(s)
	_ = s
	// TODO: 判断括号是否有效
	fmt.Println()
}`,
      rust: `use std::io;

fn main() {
    let mut s = String::new();
    io::stdin().read_line(&mut s).unwrap();
    let s = s.trim();
    let _ = s;
    // TODO: 判断括号是否有效
    println!();
}`,
    },
  },
  {
    title: "反转链表（数组模拟）",
    description: `## 题目描述

给定一个用空格分隔的整数序列，将其反转后输出。

这道题模拟了反转链表的思想，用数组表示链表节点。

## 输入格式

一行空格分隔的整数

## 输出格式

反转后的序列，空格分隔`,
    difficulty: "easy",
    tags: ["数组", "链表"],
    order: 5,
    examples: [
      { input: "1 2 3 4 5", output: "5 4 3 2 1" },
      { input: "1 2", output: "2 1" },
    ],
    testCases: [
      { input: "1 2 3 4 5", expectedOutput: "5 4 3 2 1" },
      { input: "1 2", expectedOutput: "2 1" },
      { input: "1", expectedOutput: "1" },
      { input: "10 20 30 40 50 60", expectedOutput: "60 50 40 30 20 10" },
      { input: "-1 0 1", expectedOutput: "1 0 -1" },
    ],
    starterCode: {
      cpp: `#include <iostream>
#include <vector>
#include <sstream>
using namespace std;

int main() {
    string line;
    getline(cin, line);
    istringstream iss(line);
    vector<int> nums;
    int val;
    while (iss >> val) nums.push_back(val);
    // TODO: 反转并输出
    return 0;
}`,
      python: `nums = list(map(int, input().split()))
# TODO: 反转并输出
`,
      javascript: `const nums = require('fs').readFileSync('/dev/stdin', 'utf8').trim().split(' ').map(Number);
// TODO: 反转并输出
`,
      java: `import java.util.*;

public class Main {
    public static void main(String[] args) {
        Scanner sc = new Scanner(System.in);
        String[] parts = sc.nextLine().split(" ");
        int[] nums = new int[parts.length];
        for (int i = 0; i < parts.length; i++) nums[i] = Integer.parseInt(parts[i]);
        // TODO: 反转并输出
    }
}`,
      go: `package main

import (
	"bufio"
	"fmt"
	"os"
	"strconv"
	"strings"
)

func main() {
	reader := bufio.NewReader(os.Stdin)
	line, _ := reader.ReadString('\\n')
	line = strings.TrimSpace(line)
	parts := strings.Split(line, " ")
	nums := make([]int, len(parts))
	for i, p := range parts {
		nums[i], _ = strconv.Atoi(p)
	}
	// TODO: 反转并输出
	fmt.Println()
}`,
      rust: `use std::io;

fn main() {
    let mut input = String::new();
    io::stdin().read_line(&mut input).unwrap();
    let nums: Vec<i32> = input.trim().split_whitespace()
        .map(|x| x.parse().unwrap()).collect();
    let _ = nums;
    // TODO: 反转并输出
    println!();
}`,
    },
  },
  {
    title: "最长无重复子串",
    description: `## 题目描述

给定一个字符串 \`s\`，请你找出其中不含有重复字符的**最长子串**的长度。

## 输入格式

一行字符串 s

## 输出格式

最长无重复字符子串的长度`,
    difficulty: "medium",
    tags: ["字符串", "滑动窗口", "哈希表"],
    order: 6,
    examples: [
      { input: "abcabcbb", output: "3", explanation: "最长子串是 abc，长度为 3" },
      { input: "bbbbb", output: "1", explanation: "最长子串是 b，长度为 1" },
      { input: "pwwkew", output: "3", explanation: "最长子串是 wke，长度为 3" },
    ],
    testCases: [
      { input: "abcabcbb", expectedOutput: "3" },
      { input: "bbbbb", expectedOutput: "1" },
      { input: "pwwkew", expectedOutput: "3" },
      { input: " ", expectedOutput: "1" },
      { input: "au", expectedOutput: "2" },
      { input: "dvdf", expectedOutput: "3" },
      { input: "abcdefg", expectedOutput: "7" },
      { input: "aab", expectedOutput: "2" },
    ],
    starterCode: {
      cpp: `#include <iostream>
#include <string>
using namespace std;

int main() {
    string s;
    getline(cin, s);
    // TODO: 滑动窗口求最长无重复子串
    return 0;
}`,
      python: `s = input()
# TODO: 滑动窗口求最长无重复子串
`,
      javascript: `const s = require('fs').readFileSync('/dev/stdin', 'utf8').trim();
// TODO: 滑动窗口求最长无重复子串
`,
      java: `import java.util.*;

public class Main {
    public static void main(String[] args) {
        Scanner sc = new Scanner(System.in);
        String s = sc.nextLine();
        // TODO: 滑动窗口求最长无重复子串
    }
}`,
      go: `package main

import (
	"bufio"
	"fmt"
	"os"
	"strings"
)

func main() {
	reader := bufio.NewReader(os.Stdin)
	s, _ := reader.ReadString('\\n')
	s = strings.TrimSpace(s)
	_ = s
	// TODO: 滑动窗口求最长无重复子串
	fmt.Println()
}`,
      rust: `use std::io;

fn main() {
    let mut s = String::new();
    io::stdin().read_line(&mut s).unwrap();
    let s = s.trim();
    let _ = s;
    // TODO: 滑动窗口求最长无重复子串
    println!();
}`,
    },
  },
  {
    title: "二分查找",
    description: `## 题目描述

给定一个升序排列的整数数组 \`nums\` 和一个目标值 \`target\`，使用二分查找找到目标值的下标。如果不存在，输出 \`-1\`。

## 输入格式

- 第一行：空格分隔的升序整数数组
- 第二行：目标值 target

## 输出格式

目标值的下标，不存在输出 -1`,
    difficulty: "medium",
    tags: ["数组", "二分查找"],
    order: 7,
    examples: [
      { input: "-1 0 3 5 9 12\n9", output: "4" },
      { input: "-1 0 3 5 9 12\n2", output: "-1" },
    ],
    testCases: [
      { input: "-1 0 3 5 9 12\n9", expectedOutput: "4" },
      { input: "-1 0 3 5 9 12\n2", expectedOutput: "-1" },
      { input: "1\n1", expectedOutput: "0" },
      { input: "1 3 5 7 9\n7", expectedOutput: "3" },
      { input: "2 4 6 8 10\n1", expectedOutput: "-1" },
      { input: "1 2 3 4 5 6 7 8 9 10\n10", expectedOutput: "9" },
    ],
    starterCode: {
      cpp: `#include <iostream>
#include <vector>
#include <sstream>
using namespace std;

int main() {
    string line;
    getline(cin, line);
    istringstream iss(line);
    vector<int> nums;
    int val;
    while (iss >> val) nums.push_back(val);

    int target;
    cin >> target;
    // TODO: 二分查找
    return 0;
}`,
      python: `nums = list(map(int, input().split()))
target = int(input())
# TODO: 二分查找
`,
      javascript: `const lines = require('fs').readFileSync('/dev/stdin', 'utf8').trim().split('\\n');
const nums = lines[0].split(' ').map(Number);
const target = Number(lines[1]);
// TODO: 二分查找
`,
      java: `import java.util.*;

public class Main {
    public static void main(String[] args) {
        Scanner sc = new Scanner(System.in);
        String[] parts = sc.nextLine().split(" ");
        int[] nums = new int[parts.length];
        for (int i = 0; i < parts.length; i++) nums[i] = Integer.parseInt(parts[i]);
        int target = Integer.parseInt(sc.nextLine().trim());
        // TODO: 二分查找
    }
}`,
      go: `package main

import (
	"bufio"
	"fmt"
	"os"
	"strconv"
	"strings"
)

func main() {
	reader := bufio.NewReader(os.Stdin)
	line, _ := reader.ReadString('\\n')
	line = strings.TrimSpace(line)
	parts := strings.Split(line, " ")
	nums := make([]int, len(parts))
	for i, p := range parts {
		nums[i], _ = strconv.Atoi(p)
	}

	line2, _ := reader.ReadString('\\n')
	target, _ := strconv.Atoi(strings.TrimSpace(line2))
	_ = target
	// TODO: 二分查找
	fmt.Println()
}`,
      rust: `use std::io;

fn main() {
    let mut input = String::new();
    io::stdin().read_line(&mut input).unwrap();
    let nums: Vec<i32> = input.trim().split_whitespace()
        .map(|x| x.parse().unwrap()).collect();

    let mut input2 = String::new();
    io::stdin().read_line(&mut input2).unwrap();
    let target: i32 = input2.trim().parse().unwrap();
    let _ = target;
    // TODO: 二分查找
    println!();
}`,
    },
  },
  {
    title: "合并两个有序数组",
    description: `## 题目描述

给定两个按升序排列的整数数组 \`nums1\` 和 \`nums2\`，将它们合并为一个升序数组并输出。

## 输入格式

- 第一行：空格分隔的升序整数数组 nums1
- 第二行：空格分隔的升序整数数组 nums2

## 输出格式

合并后的升序数组，空格分隔`,
    difficulty: "medium",
    tags: ["数组", "双指针", "排序"],
    order: 8,
    examples: [
      { input: "1 2 3\n2 5 6", output: "1 2 2 3 5 6" },
      { input: "1\n", output: "1", explanation: "nums2 为空" },
    ],
    testCases: [
      { input: "1 2 3\n2 5 6", expectedOutput: "1 2 2 3 5 6" },
      { input: "1\n", expectedOutput: "1" },
      { input: "\n1", expectedOutput: "1" },
      { input: "1 3 5 7\n2 4 6 8", expectedOutput: "1 2 3 4 5 6 7 8" },
      { input: "-5 -3 0\n-4 -2 1", expectedOutput: "-5 -4 -3 -2 0 1" },
    ],
    starterCode: {
      cpp: `#include <iostream>
#include <vector>
#include <sstream>
using namespace std;

int main() {
    string line1, line2;
    getline(cin, line1);
    getline(cin, line2);
    // TODO: 解析两个数组并合并
    return 0;
}`,
      python: `line1 = input().strip()
line2 = input().strip()
nums1 = list(map(int, line1.split())) if line1 else []
nums2 = list(map(int, line2.split())) if line2 else []
# TODO: 合并两个有序数组
`,
      javascript: `const lines = require('fs').readFileSync('/dev/stdin', 'utf8').trim().split('\\n');
const nums1 = lines[0] ? lines[0].split(' ').map(Number) : [];
const nums2 = lines[1] ? lines[1].split(' ').map(Number) : [];
// TODO: 合并两个有序数组
`,
      java: `import java.util.*;

public class Main {
    public static void main(String[] args) {
        Scanner sc = new Scanner(System.in);
        String line1 = sc.nextLine().trim();
        String line2 = sc.hasNextLine() ? sc.nextLine().trim() : "";
        // TODO: 解析两个数组并合并
    }
}`,
      go: `package main

import (
	"bufio"
	"fmt"
	"os"
	"strconv"
	"strings"
)

func parseLine(s string) []int {
	s = strings.TrimSpace(s)
	if s == "" {
		return []int{}
	}
	parts := strings.Split(s, " ")
	nums := make([]int, len(parts))
	for i, p := range parts {
		nums[i], _ = strconv.Atoi(p)
	}
	return nums
}

func main() {
	reader := bufio.NewReader(os.Stdin)
	line1, _ := reader.ReadString('\\n')
	line2, _ := reader.ReadString('\\n')
	nums1 := parseLine(line1)
	nums2 := parseLine(line2)
	_, _ = nums1, nums2
	// TODO: 合并两个有序数组
	fmt.Println()
}`,
      rust: `use std::io;

fn parse_line() -> Vec<i32> {
    let mut s = String::new();
    io::stdin().read_line(&mut s).unwrap();
    let s = s.trim();
    if s.is_empty() { return vec![]; }
    s.split_whitespace().map(|x| x.parse().unwrap()).collect()
}

fn main() {
    let nums1 = parse_line();
    let nums2 = parse_line();
    let _ = (&nums1, &nums2);
    // TODO: 合并两个有序数组
    println!();
}`,
    },
  },
  {
    title: "爬楼梯（动态规划）",
    description: `## 题目描述

假设你正在爬楼梯。需要 \`n\` 阶才能到达楼顶。每次你可以爬 1 或 2 个台阶。有多少种不同的方法可以爬到楼顶？

## 输入格式

一个正整数 n（1 ≤ n ≤ 45）

## 输出格式

爬到楼顶的方法总数`,
    difficulty: "medium",
    tags: ["动态规划", "数学"],
    order: 9,
    examples: [
      { input: "2", output: "2", explanation: "1+1 或 2，共 2 种" },
      { input: "3", output: "3", explanation: "1+1+1、1+2、2+1，共 3 种" },
    ],
    testCases: [
      { input: "1", expectedOutput: "1" },
      { input: "2", expectedOutput: "2" },
      { input: "3", expectedOutput: "3" },
      { input: "5", expectedOutput: "8" },
      { input: "10", expectedOutput: "89" },
      { input: "20", expectedOutput: "10946" },
      { input: "45", expectedOutput: "1836311903" },
    ],
    starterCode: {
      cpp: `#include <iostream>
using namespace std;

int main() {
    int n;
    cin >> n;
    // TODO: 动态规划求解
    return 0;
}`,
      python: `n = int(input())
# TODO: 动态规划求解
`,
      javascript: `const n = Number(require('fs').readFileSync('/dev/stdin', 'utf8').trim());
// TODO: 动态规划求解
`,
      java: `import java.util.Scanner;

public class Main {
    public static void main(String[] args) {
        int n = new Scanner(System.in).nextInt();
        // TODO: 动态规划求解
    }
}`,
      go: `package main

import "fmt"

func main() {
	var n int
	fmt.Scan(&n)
	// TODO: 动态规划求解
	fmt.Println()
}`,
      rust: `use std::io;

fn main() {
    let mut input = String::new();
    io::stdin().read_line(&mut input).unwrap();
    let n: i32 = input.trim().parse().unwrap();
    let _ = n;
    // TODO: 动态规划求解
    println!();
}`,
    },
  },
  {
    title: "最长递增子序列",
    description: `## 题目描述

给定一个整数数组 \`nums\`，找到其中最长严格递增子序列的长度。

子序列是由数组派生而来的序列，可以删除某些元素或不删除，但不改变其余元素的顺序。

## 输入格式

一行空格分隔的整数数组

## 输出格式

最长递增子序列的长度`,
    difficulty: "hard",
    tags: ["动态规划", "二分查找", "数组"],
    order: 10,
    examples: [
      { input: "10 9 2 5 3 7 101 18", output: "4", explanation: "最长递增子序列是 [2,3,7,101]，长度 4" },
      { input: "0 1 0 3 2 3", output: "4" },
      { input: "7 7 7 7 7 7 7", output: "1" },
    ],
    testCases: [
      { input: "10 9 2 5 3 7 101 18", expectedOutput: "4" },
      { input: "0 1 0 3 2 3", expectedOutput: "4" },
      { input: "7 7 7 7 7 7 7", expectedOutput: "1" },
      { input: "1 2 3 4 5", expectedOutput: "5" },
      { input: "5 4 3 2 1", expectedOutput: "1" },
      { input: "1 3 6 7 9 4 10 5 6", expectedOutput: "6" },
    ],
    starterCode: {
      cpp: `#include <iostream>
#include <vector>
#include <sstream>
using namespace std;

int main() {
    string line;
    getline(cin, line);
    istringstream iss(line);
    vector<int> nums;
    int val;
    while (iss >> val) nums.push_back(val);
    // TODO: 最长递增子序列
    return 0;
}`,
      python: `nums = list(map(int, input().split()))
# TODO: 最长递增子序列
`,
      javascript: `const nums = require('fs').readFileSync('/dev/stdin', 'utf8').trim().split(' ').map(Number);
// TODO: 最长递增子序列
`,
      java: `import java.util.*;

public class Main {
    public static void main(String[] args) {
        Scanner sc = new Scanner(System.in);
        String[] parts = sc.nextLine().split(" ");
        int[] nums = new int[parts.length];
        for (int i = 0; i < parts.length; i++) nums[i] = Integer.parseInt(parts[i]);
        // TODO: 最长递增子序列
    }
}`,
      go: `package main

import (
	"bufio"
	"fmt"
	"os"
	"strconv"
	"strings"
)

func main() {
	reader := bufio.NewReader(os.Stdin)
	line, _ := reader.ReadString('\\n')
	line = strings.TrimSpace(line)
	parts := strings.Split(line, " ")
	nums := make([]int, len(parts))
	for i, p := range parts {
		nums[i], _ = strconv.Atoi(p)
	}
	_ = nums
	// TODO: 最长递增子序列
	fmt.Println()
}`,
      rust: `use std::io;

fn main() {
    let mut input = String::new();
    io::stdin().read_line(&mut input).unwrap();
    let nums: Vec<i32> = input.trim().split_whitespace()
        .map(|x| x.parse().unwrap()).collect();
    let _ = nums;
    // TODO: 最长递增子序列
    println!();
}`,
    },
  },
];

async function main() {
  console.log("🌱 开始填充题库数据...");

  await prisma.quizSubmission.deleteMany();
  await prisma.quiz.deleteMany();

  for (const quiz of quizzes) {
    await prisma.quiz.create({
      data: {
        title: quiz.title,
        description: quiz.description,
        difficulty: quiz.difficulty,
        tags: quiz.tags,
        order: quiz.order,
        examples: quiz.examples,
        testCases: quiz.testCases,
        starterCode: quiz.starterCode,
      },
    });
    console.log(`  ✅ ${quiz.title}`);
  }

  console.log(`\n🎉 成功填充 ${quizzes.length} 道题目！`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());