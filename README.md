bicy
====

node.js 기반의 서버입니다.
임시명으로 'bicy'를 사용합니다.
express를 사용하여 개발되었습니다.

호스트 별로 스크립트를 분할하여 개발이 가능하며 모듈이 갱신되면 새로 불러옵니다.

현재 4개의 모듈이 있습니다.
site, api, page, example 입니다.
site: 웹사이트
api: iOS 클라이언트와 연동
page: 각종 페이지 생성, 보기, 짧은 url 생성

임시로 *.bicy.com 도메인을 사용하도록 했으며, hosts 파일에 관련한 사항을 추가해야 합니다.
  127.0.0.1 bicy.com
  127.0.0.1 www.bicy.com
  127.0.0.1 api.bicy.com
  127.0.0.1 page.bicy.com
  127.0.0.1 example.bicy.com