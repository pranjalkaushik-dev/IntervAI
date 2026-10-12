const JUDGE0_BASE_URL = 'https://ce.judge0.com';

const snippets = {
  Python: {
    id: 71,
    code: `import json

def two_sum(nums, target):
    return [0, 1]

if __name__ == "__main__":
    nums = [2, 7, 11, 15]
    target = 9
    print(json.dumps(two_sum(nums, target)))
`
  },
  JavaScript: {
    id: 63,
    code: `function twoSum(nums, target) {
  return [0, 1];
}

const nums = [2, 7, 11, 15];
const target = 9;
console.log(JSON.stringify(twoSum(nums, target)));
`
  },
  Java: {
    id: 62,
    code: `import java.util.*;

public class Main {
    public static int[] twoSum(int[] nums, int target) {
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
  'C++': {
    id: 54,
    code: `#include <iostream>
#include <vector>

std::vector<int> twoSum(const std::vector<int>& nums, int target) {
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
  TypeScript: {
    id: 74,
    code: `function twoSum(nums: number[], target: number): number[] {
  return [0, 1];
}

const nums = [2, 7, 11, 15];
const target = 9;
console.log(JSON.stringify(twoSum(nums, target)));
`
  },
  C: {
    id: 50,
    code: `#include <stdio.h>

void twoSum(int nums[], int n, int target, int result[]) {
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
};

async function testLang(name, conf) {
  try {
    const res = await fetch(`${JUDGE0_BASE_URL}/submissions?base64_encoded=true&wait=true`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        source_code: Buffer.from(conf.code).toString('base64'),
        language_id: conf.id,
        stdin: ''
      })
    });
    const data = await res.json();
    const stdout = data.stdout ? Buffer.from(data.stdout, 'base64').toString('utf8').trim() : '';
    const stderr = data.stderr ? Buffer.from(data.stderr, 'base64').toString('utf8').trim() : '';
    const compile = data.compile_output ? Buffer.from(data.compile_output, 'base64').toString('utf8').trim() : '';
    console.log(`${name} (id ${conf.id}): Status [${data.status?.description}] Output: [${stdout || stderr || compile}]`);
    return { name, id: conf.id, status: data.status?.description, success: stdout === '[0,1]' || stdout === '[0, 1]' };
  } catch (e) {
    console.error(`${name} failed:`, e.message);
    return { name, id: conf.id, success: false, error: e.message };
  }
}

async function run() {
  console.log('Testing all language templates produce valid [0,1] output:');
  const results = [];
  for (const [name, conf] of Object.entries(snippets)) {
    results.push(await testLang(name, conf));
  }
  const allPassed = results.every(r => r.success);
  console.log('All 6 language templates passed [0,1] check?:', allPassed);
  process.exit(allPassed ? 0 : 1);
}

run();
