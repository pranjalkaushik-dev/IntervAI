export const SUPPORTED_LANGUAGES = [
  {
    id: 71,
    name: 'Python (3.8.1)',
    monacoLang: 'python',
    extension: 'py',
    starterCode: `# Collaborative Coding Interview - Python
# Task: Given an array of integers nums and an integer target,
# return indices of the two numbers such that they add up to target.

def two_sum(nums, target):
    seen = {}
    for i, num in enumerate(nums):
        diff = target - num
        if diff in seen:
            return [seen[diff], i]
        seen[num] = i
    return []

if __name__ == "__main__":
    nums = [2, 7, 11, 15]
    target = 9
    result = two_sum(nums, target)
    print(f"Inputs: nums={nums}, target={target}")
    print(f"Output Indices: {result}")
`
  },
  {
    id: 63,
    name: 'JavaScript (Node.js)',
    monacoLang: 'javascript',
    extension: 'js',
    starterCode: `// Collaborative Coding Interview - JavaScript (Node.js)
// Task: Two Sum Problem

function twoSum(nums, target) {
  const map = new Map();
  for (let i = 0; i < nums.length; i++) {
    const complement = target - nums[i];
    if (map.has(complement)) {
      return [map.get(complement), i];
    }
    map.set(nums[i], i);
  }
  return [];
}

const nums = [2, 7, 11, 15];
const target = 9;
console.log("Inputs: nums =", nums, ", target =", target);
console.log("Output Indices:", twoSum(nums, target));
`
  },
  {
    id: 54,
    name: 'C++ (GCC 9.2.0)',
    monacoLang: 'cpp',
    extension: 'cpp',
    starterCode: `// Collaborative Coding Interview - C++
#include <iostream>
#include <vector>
#include <unordered_map>

std::vector<int> twoSum(const std::vector<int>& nums, int target) {
    std::unordered_map<int, int> numMap;
    for (int i = 0; i < nums.size(); ++i) {
        int complement = target - nums[i];
        if (numMap.find(complement) != numMap.end()) {
            return {numMap[complement], i};
        }
        numMap[nums[i]] = i;
    }
    return {};
}

int main() {
    std::vector<int> nums = {2, 7, 11, 15};
    int target = 9;
    std::vector<int> result = twoSum(nums, target);
    std::cout << "Two Sum indices: [" << result[0] << ", " << result[1] << "]" << std::endl;
    return 0;
}
`
  },
  {
    id: 62,
    name: 'Java (OpenJDK 13.0.1)',
    monacoLang: 'java',
    extension: 'java',
    starterCode: `// Collaborative Coding Interview - Java
import java.util.*;

public class Main {
    public static int[] twoSum(int[] nums, int target) {
        Map<Integer, Integer> map = new HashMap<>();
        for (int i = 0; i < nums.length; i++) {
            int complement = target - nums[i];
            if (map.containsKey(complement)) {
                return new int[] { map.get(complement), i };
            }
            map.put(nums[i], i);
        }
        return new int[] {};
    }

    public static void main(String[] args) {
        int[] nums = {2, 7, 11, 15};
        int target = 9;
        int[] res = twoSum(nums, target);
        System.out.println("Result: [" + res[0] + ", " + res[1] + "]");
    }
}
`
  },
  {
    id: 74,
    name: 'TypeScript (3.7.4)',
    monacoLang: 'typescript',
    extension: 'ts',
    starterCode: `// Collaborative Coding Interview - TypeScript
function twoSum(nums: number[], target: number): number[] {
  const map: Map<number, number> = new Map();
  for (let i = 0; i < nums.length; i++) {
    const complement = target - nums[i];
    if (map.has(complement)) {
      return [map.get(complement)!, i];
    }
    map.set(nums[i], i);
  }
  return [];
}

const nums = [2, 7, 11, 15];
const target = 9;
console.log("Indices:", twoSum(nums, target));
`
  },
  {
    id: 50,
    name: 'C (GCC 9.2.0)',
    monacoLang: 'c',
    extension: 'c',
    starterCode: `// Collaborative Coding Interview - C
#include <stdio.h>

void solve() {
    int a = 5, b = 10;
    printf("Collaborative C Execution: sum = %d\\n", a + b);
}

int main() {
    solve();
    return 0;
}
`
  }
];

export const SAMPLE_PROBLEMS = [
  {
    id: 'p1',
    title: '1. Two Sum',
    difficulty: 'Easy',
    description: `Given an array of integers nums and an integer target, return indices of the two numbers such that they add up to target.

You may assume that each input would have exactly one solution, and you may not use the same element twice. You can return the answer in any order.`,
    examples: [
      {
        input: 'nums = [2,7,11,15], target = 9',
        output: '[0,1]',
        explanation: 'Because nums[0] + nums[1] == 9, we return [0, 1].'
      },
      {
        input: 'nums = [3,2,4], target = 6',
        output: '[1,2]'
      }
    ],
    constraints: [
      '2 <= nums.length <= 10^4',
      '-10^9 <= nums[i] <= 10^9',
      '-10^9 <= target <= 10^9',
      'Only one valid answer exists.'
    ]
  },
  {
    id: 'p2',
    title: '2. Valid Palindrome',
    difficulty: 'Easy',
    description: `A phrase is a palindrome if, after converting all uppercase letters into lowercase letters and removing all non-alphanumeric characters, it reads the same forward and backward. Alphanumeric characters include letters and numbers.

Given a string s, return true if it is a palindrome, or false otherwise.`,
    examples: [
      {
        input: 's = "A man, a plan, a canal: Panama"',
        output: 'true',
        explanation: '"amanaplanacanalpanama" is a palindrome.'
      },
      {
        input: 's = "race a car"',
        output: 'false'
      }
    ],
    constraints: [
      '1 <= s.length <= 2 * 10^5',
      's consists only of printable ASCII characters.'
    ]
  }
];
