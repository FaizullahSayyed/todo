const express = require("express");
const { open } = require("sqlite");
const sqlite3 = require("sqlite3");
const nodemon = require("nodemon");
const path = require("path");
const dateHandler = require("date-fns");

const app = express();
app.use(express.json());

const dbPath = path.join(__dirname, "todoApplication.db");

let db = null;

const initializeDBAndServer = async (request, response) => {
  try {
    db = await open({ filename: dbPath, driver: sqlite3.Database });
    app.listen(3000, () => {
      console.log("DB & Server is Running....");
    });
  } catch (error) {
    console.log("Error in connecting DB/Server.");
  }
};

initializeDBAndServer();

const validValues = {
  priority: ["HIGH", "MEDIUM", "LOW"],
  status: ["TO DO", "IN PROGRESS", "DONE"],
  category: ["HOME", "WORK", "LEARNING"],
};

const validateValues = (obj) => {
  let value = null;
  if (!validValues.priority.includes(obj.priority)) {
    if (obj.priority !== "" && obj.priority !== undefined) {
      console.log(obj.priority);
      return "Priority";
    }
  }
  if (!validValues.status.includes(obj.status)) {
    if (obj.status !== "" && obj.status !== undefined) {
      console.log(obj.status);
      return "Status";
    }
  }
  if (!validValues.category.includes(obj.category)) {
    if (obj.category !== "" && obj.category !== undefined) {
      console.log(obj.category);
      return "Category";
    }
  }
  return value;
};
//API 1
app.get("/todos/", async (request, response) => {
  const {
    search_q = "",
    priority = "",
    status = "",
    category = "",
  } = request.query;
  let value = validateValues(request.query);
  console.log(value);
  if (value === null) {
    response.send(
      await db.all(`
            SELECT
                id, todo, priority, status, category,
                due_date as dueDate
            FROM
                todo
            WHERE
                todo LIKE '%${search_q}%'
                AND
                priority LIKE '%${priority}%'
                AND
                status LIKE '%${status}%'
                AND
                category LIKE '%${category}%'
                ;
          `)
    );
  } else {
    response.status(400);
    response.send(`Invalid Todo ${value}`);
  }
});

//API 2
app.get("/todos/:todoId/", async (request, response) => {
  const { todoId } = request.params;
  response.send(
    await db.get(`
            SELECT
                id, todo, priority, status, category,
                due_date as dueDate
            FROM
                todo
            WHERE
                id = ${todoId};            
        `)
  );
});

//API 3
app.get("/agenda/", async (request, response) => {
  const { date } = request.query;
  //   const parsedDate = dateHandler.parseISO(date);
  const formattedDate = dateHandler.format(new Date(date), "yyyy-MM-dd");

  if (dateHandler.isValid(dateHandler.parseISO(date))) {
    //   if (true) {
    response.send(
      await db.all(`
            SELECT
                id, todo, priority, status, category,
                due_date as dueDate
            FROM
                todo
            WHERE
                due_date = '${formattedDate}'
          `)
    );
  } else {
    response.status(400);
    response.send("Invalid Due Date");
  }
});

//API 4
app.post("/todos/", async (request, response) => {
  const { id, todo, priority, status, category, dueDate } = request.body;
  const value = validateValues(request.body);
  if (value === null) {
    if (dateHandler.isValid(dateHandler.parseISO(dueDate))) {
      await db.run(`
        INSERT INTO
            todo
        (id, todo, priority, status, category, due_date)
        VALUES
        (
            ${id},
            '${todo}',
            '${priority}',
            '${status}',
            '${category}',
            '${dueDate}'
        )
      `);
      response.send("Todo Successfully Added");
    } else {
      response.status(400);
      response.send("Invalid Due Date");
    }
  } else {
    response.status(400);
    response.send(`Invalid Todo ${value}`);
  }
});

//API 5
app.put("/todos/:todoId/", async (request, response) => {
  const { todoId } = request.params;
  const previousTodo = await db.get(`
        SELECT
                id, todo, priority, status, category,
                due_date as dueDate
            FROM
                todo
            WHERE
                id = ${todoId};
    `);
  const {
    todo = previousTodo.todo,
    priority = previousTodo.priority,
    status = previousTodo.status,
    category = previousTodo.category,
    dueDate = previousTodo.dueDate,
  } = request.body;
  const value = validateValues({ priority, status, category, dueDate });
  if (value === null) {
    if (dateHandler.isValid(dateHandler.parseISO(dueDate))) {
      await db.run(`
            UPDATE
                todo
            SET
                todo = '${todo}',
                priority = '${priority}',
                status = '${status}',
                category = '${category}',
                due_date = '${dueDate}'
            WHERE
                id = ${todoId}
            ;  
          `);
      for (let change of [
        "todo",
        "priority",
        "status",
        "category",
        "dueDate",
      ]) {
        if ("dueDate" == Object.keys(request.body)) {
          response.send("Due Date Updated");
          break;
        } else {
          if (change == Object.keys(request.body)) {
            response.send(
              change[0].toUpperCase() +
                change.substring(1, change.length) +
                " Updated"
            );
          }
        }
      }
    } else {
      response.status(400);
      response.send("Invalid Due Date");
    }
  } else {
    response.status(400);
    response.send(`Invalid Todo ${value}`);
  }
});

//API 6
app.delete("/todos/:todoId/", async (request, response) => {
  const { todoId } = request.params;
  await db.run(`
    DELETE FROM
        todo
    WHERE
        id = ${todoId};
    `);
  response.send("Todo Deleted");
});
module.exports = app;
