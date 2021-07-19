```
###Text
Text model::SQL
{
  type: plainText;
  content: 'Relational Schema\n\nDatabase model::RelationalDemo\n(\n  Table FirmTable\n  (\n    id INTEGER PRIMARY KEY,\n    Legal_name VARCHAR(200)\n  )\n  Table PersonTable\n  (\n    id INTEGER PRIMARY KEY,\n    firm_id INTEGER,\n    firstName VARCHAR(200),\n    lastName VARCHAR(200)\n  )\n\n  Join FirmPerson(PersonTable.firm_id = FirmTable.id)\n)\n\nSimple Mapping\nDrop table if exists FirmTable;\nCreate Table FirmTable (id INT, Legal_Name VARCHAR(200));\nInsert into FirmTable (id, Legal_Name) values (1,\'FINOS\');\n\nJoin\nDrop table if exists FirmTable;\nDrop table if exists PersonTable;\nCreate Table FirmTable(id INT, Legal_Name VARCHAR(200));\nCreate Table PersonTable (id INT, firm_id INT, lastName VARCHAR(200),firstName VARCHAR(200));\nInsert into FirmTable (id, Legal_Name) values (123,\'LLCCompany\');\nInsert into FirmTable (id, Legal_Name) values (456,\'NonProfitCompany\');\nInsert into PersonTable (id, firm_id, lastName, firstName) values (1,123,\'Doe\', \'Jane\');\nInsert into PersonTable (id, firm_id, lastName, firstName) values (2,456,\'Smith\', \'John\');\nInsert into PersonTable (id, firm_id, lastName, firstName) values (3,123,\'Prasad\', \'Vijay\');\nInsert into PersonTable (id, firm_id, lastName, firstName) values (4,123,\'Xu\', \'Cherry\');\nInsert into PersonTable (id, firm_id, lastName, firstName) values (5,456,\'Meyer\', \'Marie\');';
}


###Relational
Database model::RelationalDemo
(
  Table FirmTable
  (
    id INTEGER PRIMARY KEY,
    Legal_name VARCHAR(200)
  )
  Table PersonTable
  (
    id INTEGER PRIMARY KEY,
    firm_id INTEGER,
    firstName VARCHAR(200),
    lastName VARCHAR(200)
  )

  Join FirmPerson(PersonTable.firm_id = FirmTable.id)
)


###Pure
Class model::Firm extends model::LegalEntity
{
  employees: model::Person[1];
  id: String[1];
  NumberOfEmployees() {$this.employees->count()}: Number[1];
}

Class model::LegalEntity
[
  LegalNameStartsWith: $this.legalName->startsWith('L')
]
{
  legalName: String[1];
}

Class model::Person
{
  lastName: String[1];
  firstName: String[1];
}


###Mapping
Mapping model::ModelToRelational
(
  *model::Firm: Relational
  {
    ~primaryKey
    (
      [model::RelationalDemo]FirmTable.id
    )
    ~mainTable [model::RelationalDemo]FirmTable
    legalName: [model::RelationalDemo]FirmTable.Legal_name,
    id: [model::RelationalDemo]FirmTable.id
  }

  MappingTests
  [
    test_1
    (
      query: |model::Firm.all()->project([x|$x.legalName, x|$x.id], ['Legal Name', 'Id']);
      data:
      [
        <Relational, SQL, model::RelationalDemo, 
          'Drop table if exists FirmTable;\n'+
          'Create Table FirmTable (id INT, Legal_Name VARCHAR(200));\n'+
          'Insert into FirmTable (id, Legal_Name) values (1,\'FINOS\');\n'
        >
      ];
      assert: '{}';
    )
  ]
)

Mapping model::ModelToRelationalJoin
(
  *model::Firm: Relational
  {
    ~primaryKey
    (
      [model::RelationalDemo]FirmTable.id
    )
    ~mainTable [model::RelationalDemo]FirmTable
    legalName: [model::RelationalDemo]FirmTable.Legal_name,
    employees[model_Person]: [model::RelationalDemo]@FirmPerson,
    id: [model::RelationalDemo]FirmTable.id
  }
  *model::Person: Relational
  {
    ~primaryKey
    (
      [model::RelationalDemo]PersonTable.id
    )
    ~mainTable [model::RelationalDemo]PersonTable
    lastName: [model::RelationalDemo]PersonTable.lastName,
    firstName: [model::RelationalDemo]PersonTable.firstName
  }

  MappingTests
  [
    test_1
    (
      query: |model::Firm.all();
      data:
      [
        <Relational, SQL, model::RelationalDemo, 
          'Create Table FirmTable (id INT, Legal_Name VARCHAR(200));\n'+
          'Insert into FirmTable (id, Legal_Name) values (1,\'FINOS\');\n'
        >
      ];
      assert: '{}';
    )
  ]
)


###Connection
RelationalDatabaseConnection model::DemoConnection
{
  store: model::RelationalDemo;
  type: H2;
  specification: LocalH2
  {
    testDataSetupSqls: [
      'Drop table if exists FirmTable;\nDrop table if exists PersonTable;\nCreate Table FirmTable(id INT, Legal_Name VARCHAR(200));\nCreate Table PersonTable (id INT, firm_id INT, lastName VARCHAR(200),firstName VARCHAR(200));\nInsert into FirmTable (id, Legal_Name) values (123,\'LLCCompany\');\nInsert into FirmTable (id, Legal_Name) values (456,\'NonProfitCompany\');\nInsert into PersonTable (id, firm_id, lastName, firstName) values (1,123,\'Doe\', \'Jane\');\nInsert into PersonTable (id, firm_id, lastName, firstName) values (2,456,\'Smith\', \'John\');\nInsert into PersonTable (id, firm_id, lastName, firstName) values (3,123,\'Prasad\', \'Vijay\');\nInsert into PersonTable (id, firm_id, lastName, firstName) values (4,123,\'Xu\', \'Cherry\');\nInsert into PersonTable (id, firm_id, lastName, firstName) values (5,456,\'Meyer\', \'Marie\');'
      ];
  };
  auth: DefaultH2;
}


###Runtime
Runtime model::H2Runtime
{
  mappings:
  [
    model::ModelToRelationalJoin
  ];
  connections:
  [
    model::RelationalDemo:
    [
      connection_1: model::DemoConnection
    ]
  ];
}
```
