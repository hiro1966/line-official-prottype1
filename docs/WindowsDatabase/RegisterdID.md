# RegisterdID

## 概要
プロトタイプでは作成不要。  
本番環境は Oracle ODBC を想定し、アプリ側で暗号化した文字列を保存する設計とする。

## フィールド
- UserID (string) — ユーザー識別子。例: VARCHAR2(256)
- EncryptString (string) — クライアント側で暗号化された文字列。例: CLOB または VARCHAR2(4000)（サイズに応じて選択）

## 推奨 DDL（Oracle）
例: EncryptString を CLOB として扱う場合
```sql
CREATE TABLE REGISTERED_ID (
    USER_ID        VARCHAR2(256)    NOT NULL,
    ENCRYPT_STRING  CLOB,
    CONSTRAINT PK_REGISTERED_ID PRIMARY KEY (USER_ID)
);
```

EncryptString を固定長文字列（Base64 等）で保存する場合
```sql
CREATE TABLE REGISTERED_ID (
    USER_ID        VARCHAR2(256)    NOT NULL,
    ENCRYPT_STRING  VARCHAR2(4000),
    CONSTRAINT PK_REGISTERED_ID PRIMARY KEY (USER_ID)
);
```

## ODBC 接続例
- DSN を利用する場合:
    - Driver={Oracle in OraClient11g_home1};Dbq=MYDB;Uid=USER;Pwd=PASS;
- または接続文字列を環境に合わせて調整。

## 使用上の注意
- 暗号化は必ずクライアント側で行い、平文は保存しないこと。  
- UserID にインデックス（主キー）を設定して検索性能を確保する。  
- EncryptString のサイズ要件に応じて VARCHAR2/CLOB を選択する。  
- ODBC 経由の文字コード（UTF-8/AL32UTF8）設定を確認する。
