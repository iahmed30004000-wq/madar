import type { AppData } from '@/types'

export const seedData: AppData = {
  workspaceName: 'فريق مدار للتسويق',
  accounts: [
    { id: 'acc-1', name: 'متجر الأفق', handle: 'ofoq.store', platform: 'facebook', status: 'active', lastSync: '2026-11-05T02:40:00Z', campaigns: 8 },
    { id: 'acc-2', name: 'الأفق ستور', handle: 'ofoqstore', platform: 'instagram', status: 'active', lastSync: '2026-11-05T02:32:00Z', campaigns: 5 },
    { id: 'acc-3', name: 'خدمة العملاء', handle: '+962 7••• •• 491', platform: 'whatsapp', status: 'attention', lastSync: '2026-11-04T20:15:00Z', campaigns: 3 },
    { id: 'acc-4', name: 'مجتمع مدار', handle: '@madar community', platform: 'telegram', status: 'offline', lastSync: '2026-11-03T18:05:00Z', campaigns: 0 },
  ],
  groups: [
    {
      id: 'grp-1', name: 'عملاء المتجر المحتملون', platform: 'mixed', updatedAt: '2026-11-04T16:20:00Z',
      contacts: [
        { id: 'c-1', name: 'ليان خالد', phone: '+962790001101', email: 'layan@example.com', source: 'حملة إنستغرام', tags: ['مهتم', 'عميل محتمل'] },
        { id: 'c-2', name: 'سيف عادل', phone: '+962790001102', source: 'تعليقات فيسبوك', tags: ['تفاعل مرتفع'] },
        { id: 'c-3', name: 'رهف سمير', phone: '+962790001103', email: 'rahaf@example.com', source: 'نموذج الموقع', tags: ['عميل محتمل'] },
        { id: 'c-4', name: 'محمود نبيل', phone: '+962790001104', source: 'أعضاء مجموعة', tags: ['جديد'] },
        { id: 'c-5', name: 'آية منير', phone: '+962790001105', source: 'حملة إنستغرام', tags: ['مهتم'] },
      ],
    },
    {
      id: 'grp-2', name: 'أعضاء مجموعة التقنية', platform: 'facebook', updatedAt: '2026-11-03T11:10:00Z',
      contacts: [
        { id: 'c-6', name: 'عمر بسام', phone: '+962790001106', source: 'مجموعة التقنية', tags: ['عضو'] },
        { id: 'c-7', name: 'دانة هاني', phone: '+962790001107', email: 'dana@example.com', source: 'مجموعة التقنية', tags: ['عضو', 'نشط'] },
        { id: 'c-8', name: 'يزن وليد', phone: '+962790001108', source: 'مجموعة التقنية', tags: ['عضو'] },
      ],
    },
    {
      id: 'grp-3', name: 'قائمة إعادة الاستهداف', platform: 'instagram', updatedAt: '2026-11-01T09:30:00Z',
      contacts: [
        { id: 'c-9', name: 'نور الهدى', phone: '+962790001109', source: 'تفاعل المنشورات', tags: ['إعادة استهداف'] },
        { id: 'c-10', name: 'حسن رائد', phone: '+962790001110', source: 'تفاعل المنشورات', tags: ['إعادة استهداف'] },
      ],
    },
  ],
  contents: [
    { id: 'cnt-1', title: 'ترحيب بعميل جديد', body: 'أهلًا {{الاسم}} 👋 شكرًا لاهتمامك بمنتجاتنا. كيف نقدر نساعدك اليوم؟', kind: 'message', updatedAt: '2026-11-04T12:00:00Z', usage: 12 },
    { id: 'cnt-2', title: 'عرض نهاية الأسبوع', body: 'خصم خاص لفترة محدودة على مجموعة مختارة. اكتشف التفاصيل واطلب الآن.', kind: 'post', updatedAt: '2026-11-03T15:40:00Z', usage: 4 },
    { id: 'cnt-3', title: 'الرد على الاستفسار عن السعر', body: 'السعر يعتمد على الباقة المناسبة لك. أرسل لنا احتياجك ونوصلك بالتفاصيل.', kind: 'reply', updatedAt: '2026-11-02T10:30:00Z', usage: 18 },
    { id: 'cnt-4', title: 'متابعة بعد التواصل', body: 'نحب نطمئن أنك وصلتك كل المعلومات. فريقنا موجود لأي سؤال إضافي.', kind: 'message', updatedAt: '2026-11-01T08:15:00Z', usage: 7 },
  ],
  campaigns: [
    { id: 'cmp-1', name: 'ترحيب بالمهتمين الجدد', type: 'messages', platform: 'facebook', status: 'active', accountIds: ['acc-1'], audience: 'عملاء المتجر المحتملون', content: 'ترحيب بعميل جديد', schedule: '2026-11-05T01:00:00Z', createdAt: '2026-11-04T14:20:00Z', progress: 68, stats: { total: 125, success: 81, failed: 4, pending: 40 } },
    { id: 'cmp-2', name: 'منشور عرض نهاية الأسبوع', type: 'publishing', platform: 'instagram', status: 'scheduled', accountIds: ['acc-2'], audience: 'متابعو الصفحة', content: 'عرض نهاية الأسبوع', schedule: '2026-11-06T15:00:00Z', createdAt: '2026-11-04T11:10:00Z', progress: 0, stats: { total: 1, success: 0, failed: 0, pending: 1 } },
    { id: 'cmp-3', name: 'استخراج المتفاعلين مع المنشور', type: 'extraction', platform: 'facebook', status: 'completed', accountIds: ['acc-1'], audience: 'تعليقات المنشور', content: 'منشور إطلاق المجموعة', schedule: '2026-11-02T09:00:00Z', createdAt: '2026-11-02T08:30:00Z', progress: 100, stats: { total: 342, success: 342, failed: 0, pending: 0 } },
    { id: 'cmp-4', name: 'متابعة عملاء واتساب', type: 'messages', platform: 'whatsapp', status: 'paused', accountIds: ['acc-3'], audience: 'قائمة إعادة الاستهداف', content: 'متابعة بعد التواصل', schedule: '2026-11-03T17:00:00Z', createdAt: '2026-11-03T12:00:00Z', progress: 35, stats: { total: 80, success: 26, failed: 2, pending: 52 } },
  ],
  rules: [
    { id: 'rule-1', name: 'الرد على استفسار السعر', trigger: 'السعر، التكلفة، كم', response: 'الرد على الاستفسار عن السعر', platform: 'facebook', enabled: true, matches: 46 },
    { id: 'rule-2', name: 'الترحيب بالرسائل الجديدة', trigger: 'الرسالة الأولى', response: 'ترحيب بعميل جديد', platform: 'instagram', enabled: true, matches: 29 },
    { id: 'rule-3', name: 'خارج ساعات العمل', trigger: 'بعد 18:00', response: 'متابعة بعد التواصل', platform: 'whatsapp', enabled: false, matches: 11 },
  ],
  members: [
    { id: 'mem-1', name: 'أحمد خالد', email: 'ahmad@madar.local', role: 'مدير', status: 'active', lastActive: '2026-11-05T02:45:00Z' },
    { id: 'mem-2', name: 'سارة محمود', email: 'sara@madar.local', role: 'مشرف', status: 'active', lastActive: '2026-11-05T01:20:00Z' },
    { id: 'mem-3', name: 'محمد سامي', email: 'mohammad@madar.local', role: 'موظف', status: 'active', lastActive: '2026-11-04T19:40:00Z' },
    { id: 'mem-4', name: 'لينا وليد', email: 'lina@madar.local', role: 'موظف', status: 'invited', lastActive: '2026-11-04T16:00:00Z' },
  ],
  jobs: [
    {
      id: 'job-1', name: 'المتفاعلون مع إعلان المجموعة', method: 'keywords', query: 'إعلان المجموعة الجديدة', platform: 'facebook', status: 'completed', createdAt: '2026-11-02T09:00:00Z',
      results: [
        { id: 'res-1', name: 'ليان خالد', handle: 'layan.k', email: 'layan@example.com', source: 'تعليق' },
        { id: 'res-2', name: 'سيف عادل', handle: 'saif.adel', source: 'إعجاب' },
        { id: 'res-3', name: 'رهف سمير', handle: 'rahaf.s', email: 'rahaf@example.com', source: 'تعليق' },
      ],
    },
  ],
  conversations: [
    { id: 'conv-1', name: 'ليان خالد', handle: 'layan.k', platform: 'instagram', unread: 2, online: true, messages: [
      { id: 'msg-1', body: 'أهلًا، شفت إعلان المجموعة الجديدة', direction: 'incoming', time: '10:24' },
      { id: 'msg-2', body: 'ممكن تفاصيل التوصيل؟', direction: 'incoming', time: '10:25' },
    ] },
    { id: 'conv-2', name: 'سيف عادل', handle: 'saif.adel', platform: 'facebook', unread: 0, online: false, messages: [
      { id: 'msg-3', body: 'شكرًا على الرد السريع', direction: 'incoming', time: 'أمس' },
      { id: 'msg-4', body: 'يسعدنا خدمتك دائمًا', direction: 'outgoing', time: 'أمس' },
    ] },
    { id: 'conv-3', name: 'رهف سمير', handle: '+962790001103', platform: 'whatsapp', unread: 1, online: true, messages: [
      { id: 'msg-5', body: 'هل العرض ما زال متاحًا؟', direction: 'incoming', time: '09:48' },
    ] },
  ],
  activities: [
    { id: 'act-1', action: 'اكتملت حملة استخراج', detail: 'تم تجهيز 342 سجلًا في حملة استخراج المتفاعلين', time: '2026-11-04T18:20:00Z', actor: 'النظام' },
    { id: 'act-2', action: 'أضيف محتوى جديد', detail: 'تم حفظ قالب متابعة بعد التواصل', time: '2026-11-04T16:05:00Z', actor: 'سارة' },
    { id: 'act-3', action: 'تنبيه حساب', detail: 'حساب خدمة العملاء يحتاج إلى مراجعة الجلسة', time: '2026-11-04T15:30:00Z', actor: 'النظام' },
    { id: 'act-4', action: 'حملة مجدولة', detail: 'تمت جدولة منشور عرض نهاية الأسبوع', time: '2026-11-04T11:10:00Z', actor: 'أحمد' },
  ],
  settings: {
    sendingDelayMin: 20,
    sendingDelayMax: 45,
    dailyLimit: 150,
    workStart: '09:00',
    workEnd: '18:00',
    timezone: 'Asia/Amman',
    weekendPause: true,
  },
}
