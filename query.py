import sqlite3
conn = sqlite3.connect('masar.db')
cur = conn.cursor()
cur.execute('SELECT role, content FROM messages WHERE conversation_id="bb5c2fe6-66b9-4289-b733-7b44b60cacb3" ORDER BY created_at DESC LIMIT 5')
for row in cur.fetchall():
    print(row[0])
    print(row[1][:100] + "...")
