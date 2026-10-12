export const SUPPORTED_LANGUAGES = [
  {
    id: 71,
    name: 'Python (3.8.1)',
    monacoLang: 'python',
    extension: 'py',
    starterCode: `# Collaborative Coding Interview - Python
# Task: Given an array of integers nums and an integer target,
# return the indices of the two numbers that add up to the target.

def two_sum(nums, target):
    # TODO: implement the two-sum solution.
    return []

if __name__ == "__main__":
    nums = [2, 7, 11, 15]
    target = 9
    print(f"Input nums={nums}, target={target}")
    print(f"Output indices: {two_sum(nums, target)}")
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
  // TODO: implement the two-sum solution.
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

std::vector<int> twoSum(const std::vector<int>& nums, int target) {
    // TODO: implement the two-sum solution.
    return {};
}

int main() {
    std::vector<int> nums = {2, 7, 11, 15};
    int target = 9;
    std::vector<int> result = twoSum(nums, target);
    std::cout << "Two Sum indices: " << result.size() << std::endl;
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
        // TODO: implement the two-sum solution.
        return new int[] {};
    }

    public static void main(String[] args) {
        int[] nums = {2, 7, 11, 15};
        int target = 9;
        int[] res = twoSum(nums, target);
        System.out.println("Result: " + Arrays.toString(res));
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
  // TODO: implement the two-sum solution.
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
