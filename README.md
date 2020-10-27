# Directory structure of picture editing

#### 라이트룸을 이용한 사진 보정시 폴더 구조 및 사진 이동 세팅

### 기술스택
- node 12.18.1
- typescript 4.0.5
- pkg 4.4.9

### 사진 보정 폴더 구조

```
├── 원본/
│   ├── raw/
│   │   └── *.raw
│   │
│   ├── jpg/
│   │   └── *.jpg
│   │
├── 보정/
│   ├── *.jpg
│   │
├── 셀렉/
│   ├── *.raw or *.jpg
│   │
└── 카탈로그/
    ├── *.Helper.lrdata
    ├── *.Previews.lrdata
    └── *.lrcat
```

#### 1. 첫번째 실행시 폴더구조 설정 및 사진 이동
#### 2. raw파일과 jpg파일 대조 후 없는 파일 제거(사진 셀렉)