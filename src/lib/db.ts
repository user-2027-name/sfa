import postgres from 'postgres';

let sql: any;

const connectionString = process.env.POSTGRES_URL || process.env.DATABASE_URL;

if (!connectionString) {
  console.log('⚠️ No DATABASE_URL or POSTGRES_URL environment variable set. Falling back to local in-memory database.');
  
  if (!(globalThis as any).mockDb) {
    (globalThis as any).mockDb = {
      customers: [
        { id: 1, name: '株式会社サンプル', phone: '03-1234-5678', email: 'info@sample.com', status: '契約中', customer_rep: '山田 太郎', address: '東京都渋谷区...', position: '部長', postal_code: '150-0002', created_at: new Date().toISOString() },
        { id: 2, name: 'テスト工業', phone: '06-9876-5432', email: 'contact@test-ind.co.jp', status: '見込み', customer_rep: '佐藤 次郎', address: '大阪府大阪市...', position: '課長', postal_code: '530-0001', created_at: new Date().toISOString() },
      ],
      employees: [
        { id: 1, name: '管理者 太郎', department: '管理部', role: '兼務', email: 'admin@example.com', notification_webhook: '' },
        { id: 2, name: '営業 花子', department: '営業部', role: '営業', email: 'sales@example.com', notification_webhook: '' },
        { id: 3, name: '制作 次郎', department: '開発部', role: '制作', email: 'dev@example.com', notification_webhook: '' },
      ],
      projects: [
        { id: 'S-20260526-001', name: 'ホームページリニューアル', contract_type: '単発', status: '制作', amount: 500000, order_date: '2026-05-26', deadline: '2026-06-30', sales_rep_id: 2, production_rep_id: 3, customer_id: 1, notes: 'テスト案件です', discussion_date: '2026-05-20', created_at: new Date().toISOString() },
        { id: 'S-20260526-002', name: '新規LP制作', contract_type: '単発', status: '商談', amount: 150000, order_date: '2026-05-26', deadline: '2026-06-15', sales_rep_id: 2, production_rep_id: null, customer_id: 2, notes: '商談中です', discussion_date: '2026-05-25', created_at: new Date().toISOString() },
      ],
      tasks: [
        { id: 1, project_id: 'S-20260526-001', name: '要件定義', due_date: '2026-06-05', status: '完了', order_index: 0 },
        { id: 2, project_id: 'S-20260526-001', name: 'デザイン', due_date: '2026-06-15', status: '進行中', order_index: 1 },
        { id: 3, project_id: 'S-20260526-001', name: 'コーディング', due_date: '2026-06-30', status: '未着手', order_index: 2 },
      ],
      project_sequences: {} as Record<string, number>,
      system_settings: [
        { key: 'shared_webhook_url', value: '' }
      ]
    };
  }

  const db = (globalThis as any).mockDb;

  const mockSql = (strings: TemplateStringsArray, ...args: any[]) => {
    let query = strings[0];
    for (let i = 0; i < args.length; i++) {
      query += `__ARG_${i}__` + strings[i + 1];
    }
    const normalizedQuery = query.replace(/\s+/g, ' ').trim();

    // SELECT * FROM customers WHERE id =
    if (normalizedQuery.startsWith('SELECT * FROM customers WHERE id =')) {
      const id = args[0];
      return db.customers.filter((c: any) => c.id === Number(id));
    }

    // SELECT c.*, MAX(l.sent_at) ... FROM customers
    if (normalizedQuery.startsWith('SELECT c.*') && normalizedQuery.includes('FROM customers')) {
      return db.customers.map((c: any) => ({
        ...c,
        last_sent_at: null,
        last_subject: null
      }));
    }

    // INSERT INTO customers
    if (normalizedQuery.startsWith('INSERT INTO customers')) {
      const [name, phone, email, status, customer_rep, address, position, postal_code] = args;
      const newId = db.customers.length > 0 ? Math.max(...db.customers.map((c: any) => c.id)) + 1 : 1;
      const newCustomer = {
        id: newId,
        name, phone, email, status, customer_rep, address,
        position: position || null,
        postal_code: postal_code || null,
        created_at: new Date().toISOString()
      };
      db.customers.push(newCustomer);
      return [newCustomer];
    }

    // UPDATE customers SET
    if (normalizedQuery.startsWith('UPDATE customers SET')) {
      const [name, phone, email, status, customer_rep, address, position, postal_code, id] = args;
      const customer = db.customers.find((c: any) => c.id === Number(id));
      if (customer) {
        if (name !== undefined && name !== null) customer.name = name;
        if (phone !== undefined && phone !== null) customer.phone = phone;
        if (email !== undefined && email !== null) customer.email = email;
        if (status !== undefined && status !== null) customer.status = status;
        if (customer_rep !== undefined && customer_rep !== null) customer.customer_rep = customer_rep;
        if (address !== undefined && address !== null) customer.address = address;
        if (position !== undefined && position !== null) customer.position = position;
        if (postal_code !== undefined && postal_code !== null) customer.postal_code = postal_code;
      }
      return { success: true };
    }

    // DELETE FROM customers
    if (normalizedQuery.startsWith('DELETE FROM customers WHERE id =')) {
      const id = args[0];
      db.customers = db.customers.filter((c: any) => c.id !== Number(id));
      return { success: true };
    }

    // SELECT p.*, s.name ... FROM projects p
    if (normalizedQuery.startsWith('SELECT p.*') && normalizedQuery.includes('FROM projects p')) {
      const customerId = args[0];
      let projs = db.projects;
      if (normalizedQuery.includes('p.customer_id =')) {
        projs = projs.filter((p: any) => p.customer_id === Number(customerId));
      }
      return projs.map((p: any) => {
        const salesRep = db.employees.find((e: any) => e.id === Number(p.sales_rep_id));
        const prodRep = db.employees.find((e: any) => e.id === Number(p.production_rep_id));
        const cust = db.customers.find((c: any) => c.id === Number(p.customer_id));
        const pTasks = db.tasks.filter((t: any) => t.project_id === p.id);
        const completed = pTasks.filter((t: any) => t.status === '完了').length;
        return {
          ...p,
          sales_rep_name: salesRep ? salesRep.name : null,
          sales_rep_email: salesRep ? salesRep.email : null,
          production_rep_name: prodRep ? prodRep.name : null,
          production_rep_email: prodRep ? prodRep.email : null,
          customer_name: cust ? cust.name : null,
          completed_tasks: completed,
          total_tasks: pTasks.length
        };
      });
    }

    // SELECT last_val FROM project_sequences
    if (normalizedQuery.startsWith('SELECT last_val FROM project_sequences')) {
      const [date, typeCode] = args;
      const key = `${date}_${typeCode}`;
      const val = db.project_sequences[key] || 0;
      return [{ last_val: val }];
    }

    // INSERT INTO project_sequences
    if (normalizedQuery.startsWith('INSERT INTO project_sequences') || normalizedQuery.includes('ON CONFLICT')) {
      const [date, typeCode, nextVal] = args;
      const key = `${date}_${typeCode}`;
      db.project_sequences[key] = nextVal;
      return [];
    }

    // INSERT INTO projects
    if (normalizedQuery.startsWith('INSERT INTO projects')) {
      const [
        id, name, contract_type, status, amount, order_date, deadline,
        sales_rep_id, production_rep_id, customer_id,
        notify_external, sales_webhook, production_webhook,
        status_negotiation_at, status_order_at, status_progress_at, status_done_at, notes, shared_drive_url, discussion_date
      ] = args;

      const newProj = {
        id, name, contract_type, status, amount: Number(amount) || 0, order_date, deadline,
        sales_rep_id: sales_rep_id ? Number(sales_rep_id) : null,
        production_rep_id: production_rep_id ? Number(production_rep_id) : null,
        customer_id: customer_id ? Number(customer_id) : null,
        notify_external, sales_webhook, production_webhook,
        status_negotiation_at, status_order_at, status_progress_at, status_done_at, notes, shared_drive_url,
        discussion_date: discussion_date || null,
        created_at: new Date().toISOString()
      };
      db.projects.push(newProj);
      return [];
    }

    // UPDATE projects SET
    if (normalizedQuery.startsWith('UPDATE projects SET')) {
      const projId = args[args.length - 1];
      const proj = db.projects.find((p: any) => p.id === projId);
      if (proj) {
        const [
          name, customer_id, contract_type, status, amount, order_date, deadline,
          sales_rep_id, production_rep_id, notify_external, sales_webhook, production_webhook,
          notes, shared_drive_url, completed_at, negAt, ordAt, progAt, doneAt, discussion_date
        ] = args;

        if (name !== undefined && name !== null) proj.name = name;
        if (customer_id !== undefined) proj.customer_id = customer_id ? Number(customer_id) : null;
        if (contract_type !== undefined && contract_type !== null) proj.contract_type = contract_type;
        if (status !== undefined && status !== null) proj.status = status;
        if (amount !== undefined) proj.amount = amount !== null ? Number(amount) : 0;
        if (order_date !== undefined && order_date !== null) proj.order_date = order_date;
        if (deadline !== undefined) proj.deadline = deadline || null;
        if (sales_rep_id !== undefined) proj.sales_rep_id = sales_rep_id ? Number(sales_rep_id) : null;
        if (production_rep_id !== undefined) proj.production_rep_id = production_rep_id ? Number(production_rep_id) : null;
        if (notes !== undefined) proj.notes = notes || null;
        if (shared_drive_url !== undefined) proj.shared_drive_url = shared_drive_url || null;
        if (discussion_date !== undefined) proj.discussion_date = discussion_date || null;
      }
      return { success: true };
    }

    // DELETE FROM tasks WHERE project_id =
    if (normalizedQuery.startsWith('DELETE FROM tasks WHERE project_id =')) {
      const pid = args[0];
      db.tasks = db.tasks.filter((t: any) => t.project_id !== pid);
      return { success: true };
    }

    // DELETE FROM projects WHERE id =
    if (normalizedQuery.startsWith('DELETE FROM projects WHERE id =')) {
      const pid = args[0];
      const lengthBefore = db.projects.length;
      db.projects = db.projects.filter((p: any) => p.id !== pid);
      return db.projects.length < lengthBefore ? [pid] : [];
    }

    // SELECT * FROM employees
    if (normalizedQuery.startsWith('SELECT * FROM employees')) {
      return db.employees;
    }

    // SELECT * FROM tasks WHERE project_id =
    if (normalizedQuery.startsWith('SELECT * FROM tasks WHERE project_id =')) {
      const pid = args[0];
      return db.tasks.filter((t: any) => t.project_id === pid);
    }

    // INSERT INTO tasks
    if (normalizedQuery.startsWith('INSERT INTO tasks')) {
      const [project_id, name, due_date, status, order_index] = args;
      const newId = db.tasks.length > 0 ? Math.max(...db.tasks.map((t: any) => t.id)) + 1 : 1;
      const newTask = {
        id: newId,
        project_id, name, due_date, status, order_index
      };
      db.tasks.push(newTask);
      return [];
    }

    // SELECT value FROM system_settings WHERE key = 'shared_webhook_url'
    if (normalizedQuery.startsWith('SELECT value FROM system_settings')) {
      const key = args[0];
      const setting = db.system_settings.find((s: any) => s.key === key);
      return setting ? [setting] : [];
    }

    // INSERT INTO system_settings
    if (normalizedQuery.startsWith('INSERT INTO system_settings')) {
      const [key, value] = args;
      const setting = db.system_settings.find((s: any) => s.key === key);
      if (setting) {
        setting.value = value;
      } else {
        db.system_settings.push({ key, value });
      }
      return [];
    }

    return [];
  };

  mockSql.begin = async (callback: any) => {
    return await callback(mockSql);
  };

  sql = mockSql;
} else {
  sql = postgres(connectionString, {
    ssl: 'require',
    max: 10,
    idle_timeout: 20,
    connect_timeout: 30,
  });
}

export default sql;

