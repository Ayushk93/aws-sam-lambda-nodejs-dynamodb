const AWS = require('aws-sdk');
AWS.config.update({
    region: 'us-west-2'
});

let response;

exports.lambdaHandler = async (event, context) => {
    const dbClient = new AWS.DynamoDB.DocumentClient();
    const tableName = "table_name";

    try {
        let res;
        switch (true) {
            case event.httpMethod === 'GET' && event.path === '/getData':
                res = await readItem(tableName, event, dbClient);
                break;
            case event.httpMethod === 'POST' && event.path === '/createData':
                res = await createItem(tableName, event, dbClient);
                break;
            case event.httpMethod === 'GET' && event.path === '/allData':
                res = await allItem(tableName, event, dbClient);
                break;
            case event.httpMethod === 'PUT' && event.path === '/updateData':
                res = await updateItem(tableName, event, dbClient);
                break;
            case event.httpMethod === 'DELETE' && event.path === '/deleteData':
                res = await deleteItem(tableName, event, dbClient);
                break;
            default:
              res = "Path Not Found";  
        }
        response = {
            'statusCode': 200,
            'body': JSON.stringify(res),
        };
        console.log(res);
    } catch (err) {
        console.log(err);
        return err;
    }
    return response;
}

async function allItem(table, event, dbClient) {
    const params = {
        TableName: table,
    };
    const allProducts = await scanDynamoRecords(dbClient, params, []);
    return allProducts;
}

async function createItem(table, event, dbClient) {
    const body = JSON.parse(event.body);
    const params = {
        TableName: table,
        Item: {
            id: Date.now().toString(),
            info: {
                firstName: body.name,
                age: body.age
            }
        }
    };
    return await dbClient.put(params).promise();
}

async function readItem(table, event, dbClient) {
    const body = event.headers;
    const params = {
        TableName: table,
        Key: {
            id: body.id
        }
    };
    return await dbClient.get(params).promise().then((response) => {
        return response.Item;
    }, (error) => {
        console.error('Error in getting product', error);
    })
}

async function scanDynamoRecords(dbClient, scanParams, itemArray) {
    try {
        const dynamoData = await dbClient.scan(scanParams).promise();
        itemArray = itemArray.concat(dynamoData.Items);
        if (dynamoData.LastEvaluatedKey) {
            scanParams.ExclusiveStartkey = dynamoData.LastEvaluatedKey;
            return await scanDynamoRecords(dbClient, scanParams, itemArray);
        }
        return itemArray;
    } catch (error) {
        console.error('Error in getting products', error);
    }
}

async function updateItem(tableName, event, dbClient) {
    const body = JSON.parse(event.body);
    const params = {
        TableName: tableName,
        Key: {
            'id': body.id
        },
        UpdateExpression: `set ${body.key} = :value`,
        ExpressionAttributeValues: {
            ':value': body.value
        },
        ReturnValues: 'UPDATED_NEW'
    }
    return await dbClient.update(params).promise().then((response) => {
        return response;
    }, (error) => {
        console.error('Error in modifying product', error);
    })
}

async function deleteItem(table, event, dbClient) {
    const body = JSON.parse(event.body);
    const params = {
        TableName: table,
        Key: {
            'id': body.id
        },
        ReturnValues: 'ALL_OLD'
    }
    return await dbClient.delete(params).promise().then((response) => {
        return response;
    }, (error) => {
        console.error('Error in deleting product', error);
    })
}