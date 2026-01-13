
exports.canUpdateStatus = (role, from, to) => {
  const rules = {
    user: {
      shipped: ["delivered"],
      pending: ["cancelled"],
      processing: ["cancelled"],
    },
    seller: {
      pending: ["processing", "cancelled"],
      processing: ["shipped"],
    },
    admin: {
      pending: ["processing", "cancelled"],
      processing: ["shipped", "cancelled"],
      shipped: ["delivered", "refunded"],
    },
  };

  return rules[role]?.[from]?.includes(to);
};
