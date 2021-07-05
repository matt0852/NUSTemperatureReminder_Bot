require('dotenv').config()

const express = require('express')
const app = express()
app.use(express.urlencoded({ extended: true }))
app.use(express.json())

const axios = require('axios')

const url = 'https://api.telegram.org/bot' + process.env.TOKEN

sendMessage = async (chat_id, text) => {
    await axios.get(url + '/sendMessage', {
        params: {
            chat_id: chat_id,
            text: text
        }
    })
}

app.get('/', (req, res) => {
    res.send('NUS Temperature Reminder Bot, webhook added')
})

app.post('/' + process.env.TOKEN, (req, res) => {
    res.send(req.body)
})

app.listen(process.env.PORT, () => {
    console.log('Server started')
})