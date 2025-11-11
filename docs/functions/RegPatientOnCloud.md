# RegPatientOnCloud

概要
- RegPatientOnKarte（プロトタイプ名: TestRegPatientOnKarte）から受け取ったパラメータを基に、クラウド側へ患者登録処理を行う関数の仕様。
- 複雑な処理はサブFunctionに分割して実装することを想定。

目的
- ローカルの患者情報をクラウド側に登録／更新する。
- 登録結果をローカルに反映（IDマッピング／ステータス）し、ログを残す。

想定プロトタイプ名
- 本番: RegPatientOnCloud
- プロトタイプ／テスト: TestRegPatientOnKarte

受け取るパラメータ（例）
- patient (object) — 患者データ本体
    - name (string)
    - birthdate (string: YYYY-MM-DD)
    - sex (string: "M"|"F"|その他)
    - identifiers (array of {system:string, value:string})
    - attributes (object) — 任意の拡張情報
- operation (string) — "create" | "update"
- sourceContext (object) — 呼び出し元情報（Karte ID、ユーザ情報等）
- options (object, optional)
    - retry (int)
    - timeout (ms)
    - validateOnly (bool)

戻り値（例）
- success (bool)
- cloudId (string|null) — 登録済みならクラウド側ID
- status (string) — "created"|"updated"|"conflict"|"error"
- errors (array) — エラー詳細

主な処理フロー（高レベル）
1. 入力検証（ValidateParams）
2. 変換（TransformToCloudFormat）: Karte のフォーマット → クラウド API フォーマット
3. 競合チェック（Optional: CheckConflict）
4. API呼び出し（CallCloudAPI）: create/update を実行
5. レスポンス処理（HandleResponse）
     - 正常: ローカルDBに cloudId・ステータス保存（PersistLocalRecord）
     - エラー: リトライ戦略 or エラー返却
6. ロギング（AuditLog）
7. 結果返却

推奨サブFunction
- ValidateParams(params) -> throws/shared error list