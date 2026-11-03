// Fictional sample data. No real people, organisations or records.
// Structure mirrors a typical lab equipment competence matrix:
// equipment + SOP + owner, a 0–4 authorisation scale with desired/actual
// levels per person, and recurring safety training with validity periods.

window.SM_SAMPLE = (function () {
  // Small seeded PRNG so the sample is the same on every load.
  let seed = 20261103;
  const rnd = () => ((seed = (seed * 1664525 + 1013904223) % 4294967296) / 4294967296);

  const people = [
    { id: 'p1', name: 'Aoife Brennan', role: 'Lab Manager', team: 'Operations' },
    { id: 'p2', name: 'Daniel Okafor', role: 'Senior Technician', team: 'Mechanical' },
    { id: 'p3', name: 'Mei Lin', role: 'Research Scientist', team: 'Polymers' },
    { id: 'p4', name: 'Tomás Herrera', role: 'Technician', team: 'Metrology' },
    { id: 'p5', name: 'Niamh Carroll', role: 'Research Engineer', team: 'Additive' },
    { id: 'p6', name: 'Priya Raman', role: 'Simulation Engineer', team: 'Simulation' },
    { id: 'p7', name: 'Lukas Weber', role: 'Technician', team: 'Microscopy' },
    { id: 'p8', name: 'Grace Adeyemi', role: 'Postdoctoral Researcher', team: 'Polymers' },
    { id: 'p9', name: 'Ciarán Walsh', role: 'Apprentice Technician', team: 'Mechanical' },
    { id: 'p10', name: 'Sofia Rossi', role: 'Research Scientist', team: 'Materials' },
    { id: 'p11', name: 'Owen Fitzgerald', role: 'PhD Researcher', team: 'Additive' },
    { id: 'p12', name: 'Hana Kowalska', role: 'Quality Lead', team: 'Operations' }
  ];

  // [name, make, model, area, location, sop, ownerId]
  const eq = [
    ['Servo-hydraulic fatigue tester', 'Generic', 'FT-10', 'Mechanical Testing', 'Lab 1', 'SOP-MT-01', 'p2'],
    ['Universal tensile tester 100 kN', 'Generic', 'UT-100', 'Mechanical Testing', 'Lab 1', 'SOP-MT-02', 'p2'],
    ['Pendulum impact tester', 'Generic', 'PI-50', 'Mechanical Testing', 'Lab 1', 'SOP-MT-03', 'p2'],
    ['Rockwell hardness tester', 'Generic', 'RH-2', 'Mechanical Testing', 'Lab 1', 'SOP-MT-04', 'p9'],
    ['Micro-hardness tester', 'Generic', 'MH-1', 'Mechanical Testing', 'Lab 1', 'SOP-MT-05', 'p2'],
    ['Thermogravimetric analyser (TGA)', 'Generic', 'TG-55', 'Polymer Characterisation', 'Lab 2', 'SOP-PC-01', 'p3'],
    ['Differential scanning calorimeter (DSC)', 'Generic', 'DS-250', 'Polymer Characterisation', 'Lab 2', 'SOP-PC-02', 'p3'],
    ['FTIR spectrometer (ATR)', 'Generic', 'IR-4', 'Polymer Characterisation', 'Lab 2', 'SOP-PC-03', 'p8'],
    ['Rotational rheometer', 'Generic', 'RR-20', 'Polymer Characterisation', 'Lab 2', 'SOP-PC-04', 'p3'],
    ['Dynamic mechanical analyser (DMA)', 'Generic', 'DM-3', 'Polymer Characterisation', 'Lab 2', 'SOP-PC-05', 'p8'],
    ['Industrial X-ray CT scanner', 'Generic', 'CT-300', 'Metrology', 'Lab 5', 'SOP-ME-01', 'p4'],
    ['Coordinate measuring machine (CMM)', 'Generic', 'CM-7', 'Metrology', 'Lab 6', 'SOP-ME-02', 'p4'],
    ['Optical profilometer', 'Generic', 'OP-GT', 'Metrology', 'Lab 6', 'SOP-ME-03', 'p4'],
    ['Scanning electron microscope (SEM)', 'Generic', 'SE-34', 'Materials Characterisation', 'Lab 10', 'SOP-MC-01', 'p7'],
    ['Digital microscope', 'Generic', 'DMX-7', 'Materials Characterisation', 'Lab 10', 'SOP-MC-02', 'p7'],
    ['X-ray diffractometer (XRD)', 'Generic', 'XD-600', 'Materials Characterisation', 'Lab 14', 'SOP-MC-03', 'p10'],
    ['Particle size analyser', 'Generic', 'PS-35', 'Materials Characterisation', 'Lab 6', 'SOP-MC-04', 'p10'],
    ['Abrasive cut-off saw', 'Generic', 'AC-220', 'Sample Preparation', 'Lab 8', 'SOP-SP-01', 'p9'],
    ['Grinder–polisher', 'Generic', 'GP-250', 'Sample Preparation', 'Lab 8', 'SOP-SP-02', 'p9'],
    ['Tube furnace (inert gas)', 'Generic', 'TF-975', 'Sample Preparation', 'Lab 15', 'SOP-SP-03', 'p7'],
    ['Acid handling', '', '', 'Sample Preparation', 'Lab 8', 'SOP-SP-04', 'p1'],
    ['Metal powder bed fusion printer', 'Generic', 'PBF-280', 'Additive Manufacturing', 'Lab 15', 'SOP-AM-01', 'p5'],
    ['Metal powder handling', '', '', 'Additive Manufacturing', 'Lab 15', 'SOP-AM-02', 'p5'],
    ['FEA (structural simulation)', '', 'Software', 'Simulation', 'Office', 'WI-SIM-01', 'p6'],
    ['CFD (fluid simulation)', '', 'Software', 'Simulation', 'Office', 'WI-SIM-02', 'p6']
  ];

  const equipment = eq.map((r, i) => ({
    id: 'e' + (i + 1), name: r[0], make: r[1], model: r[2], area: r[3],
    location: r[4], sop: r[5], sopRev: 'B', owner: r[6]
  }));

  // How likely each team is to work in each area
  const affinity = {
    Operations: ['Sample Preparation'],
    Mechanical: ['Mechanical Testing', 'Sample Preparation'],
    Polymers: ['Polymer Characterisation'],
    Metrology: ['Metrology', 'Mechanical Testing'],
    Additive: ['Additive Manufacturing', 'Metrology', 'Sample Preparation'],
    Simulation: ['Simulation'],
    Microscopy: ['Materials Characterisation', 'Sample Preparation'],
    Materials: ['Materials Characterisation', 'Polymer Characterisation']
  };

  const today = new Date('2026-11-03');
  const iso = d => d.toISOString().slice(0, 10);
  const daysAgo = n => iso(new Date(today.getTime() - n * 86400000));

  const ratings = {};
  people.forEach(p => {
    const areas = affinity[p.team] || [];
    equipment.forEach(e => {
      const k = e.id + '|' + p.id;
      if (e.owner === p.id) {
        ratings[k] = { desired: 4, actual: 4, updated: daysAgo(200 + Math.floor(rnd() * 300)) };
        return;
      }
      if (areas.includes(e.area)) {
        const desired = rnd() < 0.5 ? 3 : 2;
        const r = rnd();
        const actual = r < 0.55 ? desired : r < 0.8 ? Math.max(0, desired - 1) : Math.max(0, desired - 2);
        ratings[k] = { desired, actual, updated: daysAgo(Math.floor(rnd() * 600)) };
      } else if (rnd() < 0.12) {
        const desired = 2;
        ratings[k] = { desired, actual: rnd() < 0.5 ? 1 : 0, updated: daysAgo(Math.floor(rnd() * 400)) };
      }
    });
  });

  const courses = [
    { id: 'c1', name: 'Gas awareness', validityMonths: 24 },
    { id: 'c2', name: 'Fire extinguisher', validityMonths: 24 },
    { id: 'c3', name: 'Manual handling', validityMonths: 36 },
    { id: 'c4', name: 'Radiation safety (X-ray)', validityMonths: 12 },
    { id: 'c5', name: 'Chemical safety', validityMonths: 24 },
    { id: 'c6', name: 'Acid / HF awareness', validityMonths: 12 },
    { id: 'c7', name: 'Cryogenic safety', validityMonths: 24 },
    { id: 'c8', name: 'Risk assessment', validityMonths: 36 }
  ];

  const records = {};
  people.forEach(p => {
    courses.forEach(c => {
      const k = c.id + '|' + p.id;
      let required = ['c1', 'c2', 'c3', 'c5'].includes(c.id);
      if (c.id === 'c4') required = ['Metrology', 'Microscopy', 'Materials', 'Additive'].includes(p.team);
      if (c.id === 'c6') required = ['Operations', 'Microscopy', 'Mechanical'].includes(p.team);
      if (c.id === 'c7') required = ['Polymers', 'Materials'].includes(p.team);
      if (c.id === 'c8') required = rnd() < 0.6;
      if (!required) { records[k] = { required: false }; return; }
      const r = rnd();
      if (r < 0.08) { records[k] = { required: true, completed: '' }; return; }
      // Spread completions so some are valid, some due soon, some overdue
      const span = c.validityMonths * 30;
      const ago = Math.floor(rnd() * span * 1.25);
      records[k] = { required: true, completed: daysAgo(ago) };
    });
  });

  const audit = [
    { ts: daysAgo(3) + 'T10:12:00', type: 'rating', by: 'Daniel Okafor', detail: 'Ciarán Walsh · Universal tensile tester 100 kN: actual 1 → 2 (supervised sign-off complete)' },
    { ts: daysAgo(9) + 'T14:40:00', type: 'training', by: 'Hana Kowalska', detail: 'Mei Lin · Chemical safety: completed ' + daysAgo(9) },
    { ts: daysAgo(21) + 'T09:05:00', type: 'equipment', by: 'Aoife Brennan', detail: 'Added equipment: Metal powder handling (SOP-AM-02)' }
  ];

  return {
    version: 1,
    org: { name: 'Northbridge Materials Lab (sample)' },
    scale: [
      { level: 0, label: 'Not authorised to operate' },
      { level: 1, label: 'Supervised: can run a set-up task under an authorised person' },
      { level: 2, label: 'Authorised to operate independently' },
      { level: 3, label: 'Authorised to operate and train others' },
      { level: 4, label: 'Expert: can calibrate / maintain' }
    ],
    people, equipment, ratings, courses, records, audit,
    user: 'Aoife Brennan'
  };
})();
