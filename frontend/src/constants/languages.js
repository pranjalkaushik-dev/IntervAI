export const SUPPORTED_LANGUAGES = [
  {
    id: 71,
    name: 'Python (3.8.1)',
    monacoLang: 'python',
    extension: 'py',
    starterCode: `# Collaborative Coding Practice - Python
import json

def two_sum(nums, target):
    # Implement your solution
    return [0, 1]

if __name__ == "__main__":
    nums = [2, 7, 11, 15]
    target = 9
    result = two_sum(nums, target)
    print(json.dumps(result))
`
  },
  {
    id: 63,
    name: 'JavaScript (Node.js)',
    monacoLang: 'javascript',
    extension: 'js',
    starterCode: `// Collaborative Coding Practice - JavaScript (Node.js)
function twoSum(nums, target) {
  // Implement your solution
  return [0, 1];
}

const nums = [2, 7, 11, 15];
const target = 9;
console.log(JSON.stringify(twoSum(nums, target)));
`
  },
  {
    id: 62,
    name: 'Java (OpenJDK 13.0.1)',
    monacoLang: 'java',
    extension: 'java',
    starterCode: `// Collaborative Coding Practice - Java
import java.util.*;

public class Main {
    public static int[] twoSum(int[] nums, int target) {
        // Implement your solution
        return new int[] {0, 1};
    }

    public static void main(String[] args) {
        int[] nums = {2, 7, 11, 15};
        int target = 9;
        int[] res = twoSum(nums, target);
        System.out.println(Arrays.toString(res));
    }
}
`
  },
  {
    id: 54,
    name: 'C++ (GCC 9.2.0)',
    monacoLang: 'cpp',
    extension: 'cpp',
    starterCode: `// Collaborative Coding Practice - C++
#include <iostream>
#include <vector>

std::vector<int> twoSum(const std::vector<int>& nums, int target) {
    // Implement your solution
    return {0, 1};
}

int main() {
    std::vector<int> nums = {2, 7, 11, 15};
    int target = 9;
    std::vector<int> res = twoSum(nums, target);
    std::cout << "[" << res[0] << "," << res[1] << "]" << std::endl;
    return 0;
}
`
  },
  {
    id: 74,
    name: 'TypeScript (3.7.4)',
    monacoLang: 'typescript',
    extension: 'ts',
    starterCode: `// Collaborative Coding Practice - TypeScript
function twoSum(nums: number[], target: number): number[] {
  // Implement your solution
  return [0, 1];
}

const nums = [2, 7, 11, 15];
const target = 9;
console.log(JSON.stringify(twoSum(nums, target)));
`
  },
  {
    id: 50,
    name: 'C (GCC 9.2.0)',
    monacoLang: 'c',
    extension: 'c',
    starterCode: `// Collaborative Coding Practice - C
#include <stdio.h>

void twoSum(int nums[], int n, int target, int result[]) {
    // Implement your solution
    result[0] = 0;
    result[1] = 1;
}

int main() {
    int nums[] = {2, 7, 11, 15};
    int target = 9;
    int result[2] = {0, 0};
    twoSum(nums, 4, target, result);
    printf("[%d,%d]\\n", result[0], result[1]);
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
