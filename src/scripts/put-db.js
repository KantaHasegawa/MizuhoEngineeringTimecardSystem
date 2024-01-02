const AWS = require("aws-sdk");
const bcrypt = require("bcrypt")
const faker = require('faker');
faker.locale = "ja";

const dynamoOptions = {
  region: "ap-northeast-1",
  endpoint: "http://localhost:8000",
  accessKeyId: "fakeAccessKeyId",
  secretAccessKey: "fakeSecretAccessKey",
}

const documentClient = new AWS.DynamoDB.DocumentClient(dynamoOptions);

const defaultParams = [
  {
    user: "管理者",
    attendance: "user",
    role: "admin",
    password: "$2b$10$PqCfZUrV1EH5fGhl8/wT4.x.IZx.eGQfM1yqYUUe6H3bKmB4rF.hW"
  },
  {
    user: "コモン",
    attendance: "user",
    role: "common",
    password: '$2b$10$NQKIzmhV2/BrbjD1.KAElORVtkQWyiflwShBbYTfox5hefDMZ5EtO'
  },
  {
    workspot: "〒467-0017 愛知県名古屋市瑞穂区東栄町５丁目１２",
    user: "workspot",
    attendance: "workspot 〒467-0017 愛知県名古屋市瑞穂区東栄町５丁目１２",
    latitude: 35.1346609,
    longitude: 136.9381131
  },
  {
    workspot: "〒105-0011 東京都港区芝公園４丁目２−８",
    user: "workspot",
    attendance: "workspot 〒105-0011 東京都港区芝公園４丁目２−８",
    latitude: 35.6585805,
    longitude: 139.7454329
  },
  {
    workspot: "〒467-0017 愛知県名古屋市瑞穂区東栄町５丁目１２",
    user: "コモン",
    attendance: "relation 〒467-0017 愛知県名古屋市瑞穂区東栄町５丁目１２",
    latitude: 35.1346609,
    longitude: 136.9381131
  },
  {
    rest: 60,
    workspot: "〒467-0017 愛知県名古屋市瑞穂区東栄町５丁目１２",
    irregularWorkTime: 0,
    leave: "20211010080000",
    user: "コモン",
    workTime: 540,
    attendance: "20211010170000",
    regularWorkTime: 480
  },
  {
    rest: 60,
    workspot: "〒467-0017 愛知県名古屋市瑞穂区東栄町５丁目１２",
    irregularWorkTime: 0,
    leave: "20211011080000",
    user: "コモン",
    workTime: 540,
    attendance: "20211011170000",
    regularWorkTime: 480
  },
  {
    rest: 60,
    workspot: "〒467-0017 愛知県名古屋市瑞穂区東栄町５丁目１２",
    irregularWorkTime: 120,
    leave: "20211012080000",
    user: "コモン",
    workTime: 660,
    attendance: "20211012190000",
    regularWorkTime: 480
  }
]

const putItem = async () => {
  for (let i = 0; i < 8; i++) {
    documentClient.put({
      TableName: 'Timecards',
      Item: defaultParams[i]
    }).promise()

  }
}

// putItem()

const createData = async () => {
  const userParams = []

  for (let i = 0; i < 100; i++) {
    let password = faker.internet.password()
    const hashedPassword = await bcrypt.hash(password, 1);
    let item = {
      user: `${faker.name.lastName()}${faker.name.firstName()}`,
      attendance: "user",
      role: "common",
      password: hashedPassword
    }
    userParams.push(item)
  }

  for (let user of userParams) {
    try {
      await documentClient.put({
        TableName: 'Timecards',
        Item: user
      }).promise()
    } catch (err) {
      console.log(err)
    }
    console.log("insert success")
  }

  for (let i = 0; i < 8; i++) {
    try {
      await documentClient.put({
        TableName: 'Timecards',
        Item: defaultParams[i]
      }).promise()
    } catch (err) {
      console.log(err)
    }
    console.log("insert success")
  }
}

createData();

module.exports = {
  documentClient: documentClient
}
