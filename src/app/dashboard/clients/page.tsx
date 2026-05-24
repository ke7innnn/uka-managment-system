'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { getClients, deleteClient, Client } from '@/lib/store';
import styles from './page.module.css';

const STATUS_OPTIONS: Client['projectStatus'][] = ['active', 'completed', 'on-hold', 'pending'];

const STATUS_COLORS: Record<Client['projectStatus'], string> = {
  active: '#10b981',
  completed: '#3b82f6',
  'on-hold': '#f59e0b',
  pending: '#9ca3af',
};

export default function ClientsPage() {
  const [clients, setClients] = useState<Client[]>([]);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState<Client['projectStatus'] | 'all'>('all');

  const reload = () => setClients(getClients());

  useEffect(() => {
    reload();
  }, []);

  const filtered = clients.filter((c) => {
    const matchSearch =
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      (c.company || '').toLowerCase().includes(search.toLowerCase()) ||
      (c.place || '').toLowerCase().includes(search.toLowerCase());
    const matchStatus = filterStatus === 'all' || c.projectStatus === filterStatus;
    return matchSearch && matchStatus;
  });

  const handleDelete = (id: string, name: string) => {
    if (confirm(`Delete client "${name}"? This cannot be undone.`)) {
      deleteClient(id);
      reload();
    }
  };

  return (
    <div className={`animate-fade-in ${styles.page}`}>
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>Clients</h1>
          <p className={styles.subtitle}>{clients.length} total client{clients.length !== 1 ? 's' : ''}</p>
        </div>
        <Link href="/dashboard/clients/new" className={styles.newBtn}>+ New Client</Link>
      </div>

      {/* Filters */}
      <div className={styles.filters}>
        <input
          type="text"
          placeholder="Search by name, company, place…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className={styles.searchInput}
          id="client-search"
        />
        <div className={styles.statusFilters}>
          {(['all', ...STATUS_OPTIONS] as const).map((s) => (
            <button
              key={s}
              className={`${styles.filterBtn} ${filterStatus === s ? styles.filterActive : ''}`}
              onClick={() => setFilterStatus(s)}
            >
              {s === 'all' ? 'All' : s.charAt(0).toUpperCase() + s.slice(1).replace('-', ' ')}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      {filtered.length === 0 ? (
        <div className={styles.empty}>
          {clients.length === 0
            ? <>No clients yet. <Link href="/dashboard/clients/new">Add your first →</Link></>
            : 'No clients match your search.'}
        </div>
      ) : (
        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Client</th>
                <th>Company</th>
                <th>Location</th>
                <th>Contact</th>
                <th>Project</th>
                <th>Status</th>
                <th>Phases</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((client) => {
                const donePhases = client.phases.filter((p) => p.completed).length;
                return (
                  <tr key={client.id}>
                    <td>
                      <div className={styles.nameCell}>
                        <div className={styles.avatar}>{client.name.charAt(0).toUpperCase()}</div>
                        <span className={styles.clientName}>{client.name}</span>
                      </div>
                    </td>
                    <td>{client.company || <span className={styles.na}>—</span>}</td>
                    <td>{client.place || <span className={styles.na}>—</span>}</td>
                    <td>
                      <div className={styles.contact}>
                        {client.phone && <span>{client.phone}</span>}
                        {client.email && <span className={styles.email}>{client.email}</span>}
                        {!client.phone && !client.email && <span className={styles.na}>—</span>}
                      </div>
                    </td>
                    <td>{client.projectName || <span className={styles.na}>—</span>}</td>
                    <td>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem', alignItems: 'flex-start' }}>
                        <span
                          className={styles.badge}
                          style={{
                            background: `${STATUS_COLORS[client.projectStatus]}22`,
                            color: STATUS_COLORS[client.projectStatus],
                            border: `1px solid ${STATUS_COLORS[client.projectStatus]}44`,
                            width: 'fit-content'
                          }}
                        >
                          {client.projectStatus.charAt(0).toUpperCase() + client.projectStatus.slice(1).replace('-', ' ')}
                        </span>
                        <span
                          className={styles.badge}
                          style={{
                            background: client.priority === 'high' ? 'rgba(192, 96, 96, 0.1)' : client.priority === 'low' ? 'rgba(106, 170, 132, 0.1)' : 'rgba(200, 169, 110, 0.1)',
                            color: client.priority === 'high' ? '#c06060' : client.priority === 'low' ? '#6aaa84' : '#c8a96e',
                            border: client.priority === 'high' ? '1px solid rgba(192, 96, 96, 0.2)' : client.priority === 'low' ? '1px solid rgba(106, 170, 132, 0.2)' : '1px solid rgba(200, 169, 110, 0.2)',
                            fontSize: '0.65rem',
                            fontWeight: 700,
                            width: 'fit-content'
                          }}
                        >
                          {(client.priority || 'medium').toUpperCase()}
                        </span>
                      </div>
                    </td>
                    <td>
                      {client.phases.length > 0 ? (
                        <div className={styles.phaseProgress}>
                          <div className={styles.progressBar}>
                            <div
                              className={styles.progressFill}
                              style={{ width: `${(donePhases / client.phases.length) * 100}%` }}
                            />
                          </div>
                          <span className={styles.phaseCount}>
                            {donePhases}/{client.phases.length}
                          </span>
                        </div>
                      ) : (
                        <span className={styles.na}>No phases</span>
                      )}
                    </td>
                    <td>
                      <div className={styles.actions}>
                        <Link href={`/dashboard/clients/${client.id}`} className={styles.viewBtn}>View</Link>
                        <Link href={`/dashboard/clients/${client.id}/edit`} className={styles.editBtn}>Edit</Link>
                        <button
                          className={styles.deleteBtn}
                          onClick={() => handleDelete(client.id, client.name)}
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
