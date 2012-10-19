bicy
====

###요약
* node.js 기반의 서버입니다
* 임시명으로 'bicy'를 사용합니다
* express를 사용하여 개발되었습니다

###기능
* 호스트 별로 스크립트를 분할하여 개발이 가능하며 모듈이 갱신되면 새로 불러옵니다.

* 현재 4개의 모듈이 있습니다.
  1. example: 예제
  2. site: 웹사이트
  3. api: iOS 클라이언트와 연동
  4. page: 각종 페이지 생성, 보기, 짧은 url 생성

* 임시로 *.bicy.com 도메인을 사용하도록 했으며, hosts 파일에 관련한 사항을 추가해야 합니다

###Short URL
* Define : modules/page.js
* Base62 기반의 Short URL, Code를 섞어서 무작위성을 가진다
* page.bicy.com/code 입력시 원본 페이지로 이동한다 (아직 안함)
* code는 실제 값과 그 값이 유효한 값인지 확인하는 3자리의 체크키가 붙어 있습니다
  1. xyyy : x = code, yyy = checkKey
  2. xxyyy : x = code, yyy = checkKey
* 체크키는 코드와 소수를 곱한 간단한 연산으로 이루어져 있습니다 [function checkKey(num) 참조]
* 체크키로 인하여 무작위로 입력해서 특정페이지를 찾아내는 것을 막을 수 있습니다 (약 23.8만번 시도해야 됨)
* page.bicy.com/ntc/num 페이지를 이용하여 숫자값을 코드로 바꿀 수 있습니다
* page.bicy.com/ctn/code 페이지를 이용하여 코드를 숫자값으로 바꿀 수 있습니다
  1. 코드가 유효하지 않으면 0을 반환합니다