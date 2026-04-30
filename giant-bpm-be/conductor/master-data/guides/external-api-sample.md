# Sample for crateing a new master data with external API
## Test the API — Call POST /external-api/test with the target URL/method. Display the raw JSON response to the user so they can see the structure.
POST /bpm/master-data/external-api/test

Request Body:
{
  "api_config": {
      "url": "https://jsonplaceholder.typicode.com/posts",
      "method": "GET",
  }
}

Receive the Response:
{
  [
    {
      "userId": 1,
      "id": 1,
      "title": "sunt aut facere repellat provident occaecati excepturi optio reprehenderit",
      "body": "quia et suscipit\nsuscipit recusandae consequuntur expedita et cum\nreprehenderit molestiae ut ut quas totam\nnostrum rerum est autem sunt rem eveniet architecto"
    },
    {
      "userId": 1,
      "id": 2,
      "title": "qui est esse",
      "body": "est rerum tempore vitae\nsequi sint nihil reprehenderit dolor beatae ea dolores neque\nfugiat blanditiis voluptate porro vel nihil molestiae ut reiciendis\nqui aperiam non debitis possimus qui neque nisi nulla"
    },
    //......
  ]
}

## Create external API dataset with field mappings
UI need to guide user to fill a json object for field_mappinngs that need to send to master_data create API.
"field_mappings" Json Mapping information example:
{
    "records_path": "", 
    "mappings": [
        {"field_name": "post_id", "json_path": "id"},
        {"field_name": "user_id", "json_path": "userId"},
        {"field_name": "title", "json_path": "title"},
        {"field_name": "content", "json_path": "body"},
        {"field_name": "ipaddr", "json_path": "meta_data.ipaddr"},
    ],  
},  


