# 데이터 로더 제거 및 데이터 초기화 계획

## 1. 코드 수정 대상 (데이터 로더 무력화)
*   **파일**: `loen-backend/src/main/java/com/loen/loen_ver2/global/config/TestDataLoader.java`
*   **작업**: 해당 파일을 삭제하거나, 파일의 내부 내용을 전부 삭제(무력화)하여 애플리케이션 기동 시 `CommandLineRunner`가 실행되지 않도록 합니다.

## 2. 배포 환경 데이터 삭제 절차
코드가 반영되고 배포된 이후, 배포 환경의 PostgreSQL 데이터베이스에서 다음의 SQL 쿼리를 실행하여 기존 더미 데이터를 수동으로 삭제해야 합니다.
1. `DELETE FROM obs_quiz;`
2. `DELETE FROM obs_content;`
